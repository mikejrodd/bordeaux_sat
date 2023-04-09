import * as Cesium from "@cesium/engine";
import CesiumSensorVolumes from "cesium-sensor-volumes";

import { SatelliteProperties } from "./SatelliteProperties";
import { CesiumComponentCollection } from "./util/CesiumComponentCollection";
import { CesiumTimelineHelper } from "./util/CesiumTimelineHelper";
import { DescriptionHelper } from "./util/DescriptionHelper";

export class SatelliteComponentCollection extends CesiumComponentCollection {
  constructor(viewer, tle, tags) {
    super(viewer);
    this.props = new SatelliteProperties(tle, tags);
  }

  enableComponent(name) {
    if (!this.created) {
      this.create();
    }
    if (!this.props.sampledPosition.valid) {
      console.error(`No valid position data available for ${this.props.name}`);
      return;
    }
    if (!(name in this.components)) {
      this.createComponent(name);
      this.updatedSampledPositionForComponents();

      if (!this.defaultEntity) {
        this.defaultEntity = this.components[name];
      }
    }

    if (name === "3D model") {
      // Adjust label offset to avoid overlap with model
      if (this.components.Label) {
        this.components.Label.label.pixelOffset = new Cesium.Cartesian2(20, 0);
      }
    }
    super.enableComponent(name);
  }

  disableComponent(name) {
    if (name === "3D model") {
      // Restore old label offset
      if (this.components.Label) {
        this.components.Label.label.pixelOffset = new Cesium.Cartesian2(10, 0);
      }
    }
    super.disableComponent(name);
  }

  create() {
    this.createDescription();

    this.props.createSampledPosition(this.viewer.clock, () => {
      this.updatedSampledPositionForComponents(true);
    });

    // Set up event listeners
    this.viewer.selectedEntityChanged.addEventListener((entity) => {
      if (!entity || entity?.name === "Ground station") {
        CesiumTimelineHelper.clearHighlightRanges(this.viewer);
        return;
      }
      if (this.isSelected) {
        this.props.updatePasses(this.viewer.clock.currentTime);
        CesiumTimelineHelper.updateHighlightRanges(this.viewer, this.props.passes);
      }
    });

    this.viewer.trackedEntityChanged.addEventListener(() => {
      if (this.isTracked) {
        this.artificiallyTrack();
      }
      if ("Orbit" in this.components && !this.isCorrectOrbitComponent()) {
        // Recreate Orbit to change visualisation type
        this.disableComponent("Orbit");
        this.enableComponent("Orbit");
      }
    });
  }

  updatedSampledPositionForComponents(update = false) {
    const { fixed, inertial } = this.props.sampledPosition;

    Object.entries(this.components).forEach(([type, component]) => {
      if (type === "Orbit") {
        component.position = inertial;
        if (update && component instanceof Cesium.Primitive) {
          // Primitives need to be recreated to update the geometry
          this.disableComponent("Orbit");
          this.enableComponent("Orbit");
        }
      } else if (type === "Sensor cone") {
        component.position = fixed;
        component.orientation = new Cesium.CallbackProperty((time) => {
          const position = this.props.position(time);
          const hpr = new Cesium.HeadingPitchRoll(0, Cesium.Math.toRadians(180), 0);
          return Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
        }, false);
      } else {
        component.position = fixed;
        component.orientation = new Cesium.VelocityOrientationProperty(fixed);
      }
    });
    // Request a single frame after satellite position updates when the clock is paused
    if (!this.viewer.clock.shouldAnimate) {
      const removeCallback = this.viewer.clock.onTick.addEventListener(() => {
        this.viewer.scene.requestRender();
        removeCallback();
      });
    }
  }

  createComponent(name) {
    switch (name) {
      case "Point":
        this.createPoint();
        break;
      case "Label":
        this.createLabel();
        break;
      case "Orbit":
        this.createOrbit();
        break;
      case "Orbit track":
        this.createOrbitTrack();
        break;
      case "Ground track":
        this.createGroundTrack();
        break;
      case "Sensor cone":
        this.createCone();
        break;
      case "3D model":
        this.createModel();
        break;
      case "Ground station link":
        this.createGroundStationLink();
        break;
      default:
        console.error("Unknown component");
    }
  }

  createDescription() {
    this.description = DescriptionHelper.cachedCallbackProperty((time) => {
      const cartographic = this.props.orbit.positionGeodetic(Cesium.JulianDate.toDate(time), true);
      const content = DescriptionHelper.renderDescription(time, this.props.name, cartographic, this.props.passes, false, this.props.orbit.tle);
      return content;
    });
  }

  createCesiumSatelliteEntity(entityName, entityKey, entityValue) {
    this.createCesiumEntity(entityName, entityKey, entityValue, this.props.name, this.description, this.props.sampledPosition.fixed, true);
  }

  createPoint() {
    const point = new Cesium.PointGraphics({
      pixelSize: 6,
      color: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.DIMGREY,
      outlineWidth: 1,
    });
    this.createCesiumSatelliteEntity("Point", "point", point);
  }

  createBox() {
    const size = 1000;
    const box = new Cesium.BoxGraphics({
      dimensions: new Cesium.Cartesian3(size, size, size),
      material: Cesium.Color.WHITE,
    });
    this.createCesiumSatelliteEntity("Box", "box", box);
  }

  createModel() {
    const model = new Cesium.ModelGraphics({
      uri: `./data/models/${this.props.name.split(" ").join("-")}.glb`,
      minimumPixelSize: 50,
      maximumScale: 10000,
    });
    this.createCesiumSatelliteEntity("3D model", "model", model);
  }

  createLabel() {
    const label = new Cesium.LabelGraphics({
      text: this.props.name,
      font: "15px Arial",
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineColor: Cesium.Color.DIMGREY,
      outlineWidth: 2,
      horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
      pixelOffset: new Cesium.Cartesian2(10, 0),
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(2000, 8e7),
      translucencyByDistance: new Cesium.NearFarScalar(6e7, 1.0, 8e7, 0.0),
    });
    this.createCesiumSatelliteEntity("Label", "label", label);
  }

  createOrbit() {
    if (this.isTracked) {
      // Use a path graphic to visualize the currently tracked satellite's orbit
      this.createOrbitPath();
    } else {
      // For all other satellites use a polyline geometry to visualize the orbit for significantly improved performance.
      // A polyline geometry is used instead of a polyline graphic as entities don't support adjusting the model matrix
      // in order to display the orbit in the inertial frame.
      this.createOrbitPolyline();
    }
  }

  isCorrectOrbitComponent() {
    return this.isTracked ? this.components.Orbit instanceof Cesium.Entity : this.components.Orbit instanceof Cesium.Primitive;
  }

  createOrbitPath() {
    const path = new Cesium.PathGraphics({
      leadTime: (this.props.orbit.orbitalPeriod * 60) / 2 + 5,
      trailTime: (this.props.orbit.orbitalPeriod * 60) / 2 + 5,
      material: Cesium.Color.WHITE.withAlpha(0.15),
      resolution: 600,
      width: 2,
    });
    this.createCesiumEntity("Orbit", "path", path, this.props.name, this.description, this.props.sampledPosition.inertial, true);
  }

  createOrbitPolyline() {
    const primitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.PolylineGeometry({
          positions: this.props.getSampledInertialPositionsForNextOrbit(this.viewer.clock.currentTime),
          width: 2,
          arcType: Cesium.ArcType.NONE,
          // granularity: Cesium.Math.RADIANS_PER_DEGREE * 10,
          vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT,
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(new Cesium.Color(1.0, 1.0, 1.0, 0.15)),
        },
        id: this.props.name,
      }),
      appearance: new Cesium.PolylineColorAppearance(),
      asynchronous: false,
    });
    const icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(this.viewer.clock.currentTime);
    if (Cesium.defined(icrfToFixed)) {
      // TODO: Cache the model matrix
      primitive.modelMatrix = Cesium.Matrix4.fromRotationTranslation(icrfToFixed);
    }
    this.components.Orbit = primitive;

    // Update the model matrix periodically to keep the orbit in the inertial frame
    let lastUpdated = this.viewer.clock.currentTime;
    const orbitRefreshRate = 0.5;
    this.viewer.clock.onTick.addEventListener((onTickClock) => {
      // TODO: Investigate recreation of the primitive
      const dt = Math.abs(Cesium.JulianDate.secondsDifference(onTickClock.currentTime, lastUpdated));
      if (dt >= orbitRefreshRate) {
        lastUpdated = onTickClock.currentTime;
        const icrfToFixed2 = Cesium.Transforms.computeIcrfToFixedMatrix(onTickClock.currentTime);
        if (Cesium.defined(icrfToFixed2)) {
          primitive.modelMatrix = Cesium.Matrix4.fromRotationTranslation(icrfToFixed2);
        }
      }
    });
  }

  createOrbitTrack(leadTime = this.props.orbit.orbitalPeriod * 60, trailTime = 0) {
    const path = new Cesium.PathGraphics({
      leadTime,
      trailTime,
      material: Cesium.Color.GOLD.withAlpha(0.15),
      resolution: 600,
      width: 2,
    });
    this.createCesiumSatelliteEntity("Orbit track", "path", path);
  }

  createGroundTrack(width = 165) {
    if (this.props.orbit.orbitalPeriod > 60 * 2) {
      // Ground track unavailable for non-LEO satellites
      return;
    }
    const corridor = new Cesium.CorridorGraphics({
      cornerType: Cesium.CornerType.MITERED,
      material: Cesium.Color.ORANGE.withAlpha(0.2),
      positions: new Cesium.CallbackProperty((time) => this.props.groundTrack(time), false),
      width: width * 1000,
    });
    this.createCesiumSatelliteEntity("Ground track", "corridor", corridor);
  }

  createCone(fov = 10) {
    if (this.props.orbit.orbitalPeriod > 60 * 2) {
      // Cone graphic unavailable for non-LEO satellites
      return;
    }
    const entity = new Cesium.Entity();
    entity.addProperty("conicSensor");
    entity.conicSensor = new CesiumSensorVolumes.ConicSensorGraphics({
      radius: 1000000,
      innerHalfAngle: Cesium.Math.toRadians(0),
      outerHalfAngle: Cesium.Math.toRadians(fov),
      lateralSurfaceMaterial: Cesium.Color.GOLD.withAlpha(0.15),
      intersectionColor: Cesium.Color.GOLD.withAlpha(0.3),
      intersectionWidth: 1,
    });
    this.components["Sensor cone"] = entity;
  }

  createGroundStationLink() {
    if (!this.props.groundStationAvailable) {
      return;
    }
    const polyline = new Cesium.PolylineGraphics({
      followSurface: false,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.5,
        color: Cesium.Color.FORESTGREEN,
      }),
      positions: new Cesium.CallbackProperty((time) => {
        const satPosition = this.props.position(time);
        const groundPosition = this.props.groundStationPosition.cartesian;
        const positions = [satPosition, groundPosition];
        return positions;
      }, false),
      show: new Cesium.CallbackProperty((time) => this.props.passIntervals.contains(time), false),
      width: 5,
    });
    this.createCesiumSatelliteEntity("Ground station link", "polyline", polyline);
  }

  set groundStation(position) {
    // No groundstation calculation for GEO satellites
    if (this.props.orbit.orbitalPeriod > 60 * 12) {
      return;
    }

    this.props.groundStationPosition = position;
    this.props.clearPasses();
    if (this.isSelected || this.isTracked) {
      this.props.updatePasses(this.viewer.clock.currentTime);
      if (this.isSelected) {
        CesiumTimelineHelper.updateHighlightRanges(this.viewer, this.props.passes);
      }
    }
    if (this.created) {
      this.createGroundStationLink();
    }
  }
}
