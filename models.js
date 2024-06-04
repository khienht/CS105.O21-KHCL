import * as THREE from 'three';
import { LDrawLoader } from 'three/addons/loaders/LDrawLoader.js';

const ldrawPath = 'models/ldraw/officialLibrary/';

export const modelFileList = {
    'Car': 'models/car.ldr_Packed.mpd',
    'Lunar Vehicle': 'models/1621-1-LunarMPVVehicle.mpd_Packed.mpd',
    'Radar Truck': 'models/889-1-RadarTruck.mpd_Packed.mpd',
    'Trailer': 'models/4838-1-MiniVehicles.mpd_Packed.mpd',
    'Bulldozer': 'models/4915-1-MiniConstruction.mpd_Packed.mpd',
    'Helicopter': 'models/4918-1-MiniFlyers.mpd_Packed.mpd',
    'Plane': 'models/5935-1-IslandHopper.mpd_Packed.mpd',
    'Lighthouse': 'models/30023-1-Lighthouse.ldr_Packed.mpd',
    'X-Wing mini': 'models/30051-1-X-wingFighter-Mini.mpd_Packed.mpd',
    'AT-ST mini': 'models/30054-1-AT-ST-Mini.mpd_Packed.mpd',
    'AT-AT mini': 'models/4489-1-AT-AT-Mini.mpd_Packed.mpd',
    'Shuttle': 'models/4494-1-Imperial Shuttle-Mini.mpd_Packed.mpd',
    'TIE Interceptor': 'models/6965-1-TIEIntercep_4h4MXk5.mpd_Packed.mpd',
    'Star fighter': 'models/6966-1-JediStarfighter-Mini.mpd_Packed.mpd',
    'X-Wing': 'models/7140-1-X-wingFighter.mpd_Packed.mpd',
    'AT-ST': 'models/10174-1-ImperialAT-ST-UCS.mpd_Packed.mpd'
};

export function reloadObject(modelName, useFlatColors = false) {
    return new Promise((resolve, reject) => {
        const lDrawLoader = new LDrawLoader();
        lDrawLoader.smoothNormals = true;

        lDrawLoader.setPath(ldrawPath).load(modelFileList[modelName], function (group2) {
            let model = group2;

            if (useFlatColors) {
                function convertMaterial(material) {
                    const newMaterial = new THREE.MeshBasicMaterial();
                    newMaterial.color.copy(material.color);
                    newMaterial.polygonOffset = material.polygonOffset;
                    newMaterial.polygonOffsetUnits = material.polygonOffsetUnits;
                    newMaterial.polygonOffsetFactor = material.polygonOffsetFactor;
                    newMaterial.opacity = material.opacity;
                    newMaterial.transparent = material.transparent;
                    newMaterial.depthWrite = material.depthWrite;
                    newMaterial.toneMapping = false;

                    return newMaterial;
                }

                model.traverse(c => {
                    if (c.isMesh) {
                        if (Array.isArray(c.material)) {
                            c.material = c.material.map(convertMaterial);
                        } else {
                            c.material = convertMaterial(c.material);
                        }
                    }
                });
            }

            // Rotate the model 180 degrees around the X-axis to convert from LDraw coordinates
            model.rotation.x = Math.PI;
            model.scale.set(0.4, 0.4, 0.4);

            // Adjust camera and light if controls are defined
            const bbox = new THREE.Box3().setFromObject(model);
            const size = bbox.getSize(new THREE.Vector3());
            const radius = Math.max(size.x, Math.max(size.y, size.z)) * 0.5;

            if (typeof controls !== 'undefined') {
                controls.target0.copy(bbox.getCenter(new THREE.Vector3()));
                controls.position0.set(-2.3, 1, 2).multiplyScalar(radius).add(controls.target0);
                controls.reset();
            }

            resolve(model);
        }, undefined, reject);
    });
}
