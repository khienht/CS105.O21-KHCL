import * as THREE from 'three';
import { TeapotGeometry } from "three/addons/geometries/TeapotGeometry.js";
import { GUI, color } from "./lib/dat.gui.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { AssetManager } from './diamond/AssetManager.js';
import { EffectComposer } from 'https://unpkg.com/three@0.142.0/examples/jsm/postprocessing/EffectComposer.js';
import { ShaderPass } from 'https://unpkg.com/three@0.142.0/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'https://unpkg.com/three@0.142.0/examples/jsm/postprocessing/SMAAPass.js';
import { GammaCorrectionShader } from 'https://unpkg.com/three@0.142.0/examples/jsm/shaders/GammaCorrectionShader.js';
// Custom shader for additional effects
import { EffectShader } from "./diamond/EffectShader.js";
import { makeDiamond } from './diamond.js';
import { init_models, remove_models } from './models.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export var scene, camera, renderer, mesh, currentMeshName, currentMeshMaterial, texture, controls, light_env, dark_env, gui;
var planeGeo, planeMat;
var cubeRenderTarget, cubeCamera;
var transControls;
var LightSwitch = false, objcolorflag = false;
let translateActive = false;
var meshPlane, light, helper, plFolder, abFolder, dlFolder, slFolder, hemisphereFolder, objectFolder;
var bounces, ior, objColor, objDiamondColor;
var environment;

var transControls, color_bkgr, color_mat = 0xffffff;;
var material;
// Geometry
var BoxG = new THREE.BoxGeometry(30, 30, 30, 40, 40, 40);
var SphereG = new THREE.SphereGeometry(20, 20, 20);
var ConeG = new THREE.ConeGeometry(18, 30, 32, 20);
var CylinderG = new THREE.CylinderGeometry(15, 15, 30, 30, 5);
var TorusG = new THREE.TorusGeometry(20, 5, 20, 100);
var teapotGeo = new TeapotGeometry(16);
var diamondGeo;

var obj_material;
var WIDTH = window.innerWidth, HEIGHT = window.innerHeight;
init();
async function init() {
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(75, WIDTH / HEIGHT, 1, 1000);
    camera.position.set(30, 50, 100);
    camera.lookAt(scene.position);
    // renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(WIDTH, HEIGHT);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.LinearToneMapping;
    renderer.toneMappingExposure = 1;
    document.body.appendChild(renderer.domElement);

    window.addEventListener('resize', onWindowResize);

    // Create cube camera
    cubeRenderTarget = new THREE.WebGLCubeRenderTarget(128, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    cubeRenderTarget.texture.type = THREE.HalfFloatType;
    cubeCamera = new THREE.CubeCamera(1, 100000, cubeRenderTarget);
    scene.add(cubeCamera);

    obj_material = new THREE.MeshStandardMaterial({ color: '#ffffff', });
    obj_material.toneMapped = false;
    obj_material.envMapIntensity = 0.2;

    // Grid
    var size = 300;
    var divisions = 40;
    var gridHelper = new THREE.GridHelper(size, divisions, 0xffffff, 0xffffff);
    scene.add(gridHelper);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    transControls = new TransformControls(camera, renderer.domElement);
    transControls.size = 0.5;
    transControls.addEventListener("dragging-changed", (event) => {
        controls.enabled = !event.value;
    });
    // transControls.addEventListener('change', render);

    //GUI control
    {
        gui = new GUI({
            autoPlace: false
        });
        let customContainer = document.getElementById("my-gui-container");
        customContainer.appendChild(gui.domElement);
        gui.updateDisplay();
    }
    gui.add(renderer, 'toneMappingExposure', 0, 2).name('exposure');
    // View gui controls
    {
        const folderviewgui = gui.addFolder("View");
        // folderviewgui.open();
        folderviewgui.add(camera.position, "x", -600, 600).name("Camera X").onChange(updateCamera);
        folderviewgui.add(camera.position, "y", -600, 600).name("Camera Y").onChange(updateCamera);
        folderviewgui.add(camera.position, "z", -600, 600).name("Camera Z").onChange(updateCamera);
    }

    {
        const foldercamgui = gui.addFolder("Camera");
        foldercamgui.add(camera, "fov", 0, 180).name("FOV").onChange(updateCamera);
        foldercamgui.add(camera, "near", 0.1, 100, 0.1).name("Near").onChange(updateCamera);
        foldercamgui.add(camera, "far", 200, 2000, 10).name("Far").onChange(updateCamera);
    }
    await loadAssets();
    ChangeBackGround(1);

    // Init plane for showing shadow
    planeGeo = new THREE.PlaneGeometry(size, size);
    planeMat = new THREE.MeshPhongMaterial({
        // color: "#15151e",
        side: THREE.DoubleSide,
    });
    {
        meshPlane = new THREE.Mesh(planeGeo, planeMat);
        meshPlane.receiveShadow = true;
        meshPlane.rotation.x = -Math.PI / 2;
        meshPlane.toneMapped = false;
    }
    // gridHelper.add(meshPlane);
    setupPostProcessing();
    renderer.setAnimationLoop(render);
}
function render() {
    cubeCamera.update(renderer, scene);
    controls.update();
    renderer.render(scene, camera);
}
// Resize handler
function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}
//post processing 
function setupPostProcessing() {
    const defaultTexture = new THREE.WebGLRenderTarget(WIDTH, HEIGHT, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter
    });
    defaultTexture.depthTexture = new THREE.DepthTexture(WIDTH, HEIGHT, THREE.FloatType);

    const composer = new EffectComposer(renderer);
    composer.addPass(new ShaderPass(EffectShader));
    composer.addPass(new ShaderPass(GammaCorrectionShader));
    composer.addPass(new SMAAPass(WIDTH, HEIGHT));
}
async function loadAssets() {
    // Load light environment
    const lightEnvPromise = new Promise((resolve, reject) => {
        new RGBELoader()
            .setPath('')
            .load('sky.hdr', (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                texture.light = new THREE.AmbientLight(0xffffff, 0.5)
                resolve(texture);
            }, undefined, reject);
    });

    // Load dark environment
    const darkEnvPromise = new Promise((resolve, reject) => {
        new RGBELoader()
            .setPath('')
            .load('night.hdr', (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                texture.light = new THREE.AmbientLight(0xffffff, 0.5);
                resolve(texture);
            }, undefined, reject);
    });

    // Load model diamond geometry
    const gltfPromise = AssetManager.loadGLTFAsync("diamond/diamond.glb");
    var gltf;
    [light_env, dark_env, gltf] = await Promise.all([lightEnvPromise, darkEnvPromise, gltfPromise]);

    diamondGeo = gltf.scene.children[0].children[0].children[0].children[0].children[0].geometry;
    diamondGeo.scale(20, 20, 20);
}
function getHeart() {
    const x = -10,
        y = -10;
    var heartShape = new THREE.Shape();
    heartShape.moveTo(x + 5, y + 5);
    heartShape.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y);
    heartShape.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7);
    heartShape.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19);
    heartShape.bezierCurveTo(x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7);
    heartShape.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y);
    heartShape.bezierCurveTo(x + 7, y, x + 5, y + 5, x + 5, y + 5);
    return heartShape;
}
function create_background_point() {
    const vertices = [];
    const num_points = 30000;
    for (let i = 0; i < num_points; i++) {
        const x = THREE.MathUtils.randFloatSpread(2000);
        const y = THREE.MathUtils.randFloatSpread(2000);
        const z = THREE.MathUtils.randFloatSpread(2000);

        vertices.push(x, y, z);
    }

    const background_geometry = new THREE.BufferGeometry();
    background_geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3)
    );

    const background_material = new THREE.PointsMaterial({ color: 0x888888 });
    const background_points = new THREE.Points(
        background_geometry,
        background_material
    );
    return background_points;
}

let currentEnvironment = null; // Biến lưu trữ texture nền hiện tại
//dark light mode
async function ChangeBackGround(id) {
    var bkg = scene.getObjectByName("bkg");
    if (bkg) {
        scene.remove(bkg);
        bkg.geometry.dispose();
        bkg.material.dispose();
    }

    if (id == 1) { // light
        currentEnvironment = light_env;
        scene.background = light_env;
        scene.environment = light_env;
        renderer.toneMappingExposure = 1;
    } else { // dark
        currentEnvironment = dark_env;
        scene.background = dark_env;
        scene.environment = dark_env;
        renderer.toneMappingExposure = 0.05;
    }

    // Adjust the maximum value of the toneMappingExposure control
    if (gui.__controllers) {
        for (var i in gui.__controllers) {
            if (gui.__controllers[i].property === 'toneMappingExposure') {
                if (id == 0) { // dark environment
                    gui.__controllers[i].max(0.1);
                } else { // light environment
                    gui.__controllers[i].max(2);
                }
                gui.__controllers[i].updateDisplay();
            }
        }
    } else {
        // Add the exposure control if it doesn't exist
        gui.add(renderer, 'toneMappingExposure', 0, (id == 1) ? 0.1 : 2).name('Exposure');
    }

    // Uncomment if you need to update cubeCamera texture
    // cubeCamera.texture = currentEnvironment.texture;
}

window.ChangeBackGround = ChangeBackGround;

function updateCamera() {
    camera.updateProjectionMatrix();
}

//draw geometry
async function addMesh(id) {
    if (toggle_model) {
        toggle_model = !toggle_model;
        remove_models();
    }
    // Remove the existing mesh
    if (mesh) {
        scene.remove(mesh);
    }
    // Switch case to create new mesh based on id
    switch (id) {
        case 1:
            mesh = new THREE.Mesh(BoxG, obj_material);
            currentMeshName = 'box';
            break;
        case 2:
            mesh = new THREE.Mesh(SphereG, obj_material);
            currentMeshName = 'sphere';
            break;
        case 3:
            mesh = new THREE.Mesh(ConeG, obj_material);
            currentMeshName = 'cone';
            break;
        case 4:
            mesh = new THREE.Mesh(CylinderG, obj_material);
            currentMeshName = 'cylinder';
            break;
        case 5:
            mesh = new THREE.Mesh(TorusG, obj_material);
            currentMeshName = 'torus';
            break;
        case 6:
            mesh = new THREE.Mesh(teapotGeo, obj_material);
            currentMeshName = 'teapot';
            break;
        case 7: {
            const extrudeSettings = {
                amount: 2,
                bevelEnabled: true,
                bevelSegments: 2,
                steps: 2,
                bevelSize: 1,
                bevelThickness: 1
            };
            const heartShape = getHeart();
            const heart = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
            mesh = new THREE.Mesh(heart, obj_material);
            currentMeshName = 'heart';
            break;
        }
        case 8:
            mesh = new THREE.Mesh(diamondGeo, obj_material);
            currentMeshName = 'diamond';
            break;
    }
    // // Add color GUI if it hasn't been added already
    // if (!objcolorflag) {
    //     objColor = { color: mesh.material.color.getHex() };
    //     objColorGUI = gui.addColor(objColor, 'color').name('Object Color');
    //     objColorGUI.onChange((value) => {
    //         mesh.material.color.setHex(value);
    //     });

    //     objcolorflag = true;
    // }
    // Add object folder
    // Initialize objectFolder if it hasn't been created
    if (!objcolorflag) {
        objectFolder = gui.addFolder("Objects");
        // Add a color picker to the folder
        objColor = objectFolder.addColor({ color: `#${mesh.material.color.getHexString()}` }, 'color').name("Color").onChange((value) => {
            mesh.material.color.set(value);
        });
        objcolorflag = true;
    }

    // Set mesh properties
    mesh.name = "mesh1";
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Add mesh to the scene
    scene.add(mesh);

    // Apply transformation and render the scene
    transform(mesh);
    // render();
}
window.addMesh = addMesh;
let toggle_model = false;
function toggleModel() {
    toggle_model = !toggle_model;
    if (objectFolder) {
        gui.removeFolder(objectFolder)
        objectFolder = null;
    }
    if (toggle_model) {
        scene.remove(mesh)
        init_models();
    }
    else {
        remove_models();
    }
}
window.toggleModel = toggleModel;

function removeGeometry() {
    if (scene.getObjectById(mesh.id) !== undefined && transControls.object && objcolorflag == true) {
        scene.remove(mesh);
        gui.removeFolder(objectFolder);
        RemoveAllAnimation();
        // Dispose geometry and material to free up resources
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();

        console.log("Mesh đã được xóa khỏi scene.");
    } else {
        console.log("Mesh không tồn tại trong scene.");
    }
    objcolorflag = false;
}
window.removeGeometry = removeGeometry;

function CloneMesh(dummy_mesh) {
    mesh.name = dummy_mesh.name;
    mesh.position.set(dummy_mesh.position.x, dummy_mesh.position.y, dummy_mesh.position.z);
    mesh.rotation.set(dummy_mesh.rotation.x, dummy_mesh.rotation.y, dummy_mesh.rotation.z);
    mesh.scale.set(dummy_mesh.scale.x, dummy_mesh.scale.y, dummy_mesh.scale.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    scene.add(mesh);
    transform(mesh);
}

// change surface
function SetSurface(mat) {
    if (mesh) {
        const dummy_mesh = mesh.clone();
        scene.remove(mesh);
        switch (mat) {
            case 1: //Point
                material = new THREE.PointsMaterial({ color: mesh.material.color, size: 0.8 });
                material.toneMapped = false;
                mesh = new THREE.Points(dummy_mesh.geometry, material);
                CloneMesh(dummy_mesh);
                break;
            case 2: //Line
                material = new THREE.MeshStandardMaterial({ color: mesh.material.color, wireframe: true });
                material.toneMapped = false;
                mesh = new THREE.Line(dummy_mesh.geometry, material);
                CloneMesh(dummy_mesh);
                break;
            case 3: //Solid
                material = new THREE.MeshPhongMaterial({ color: mesh.material.color });
                material.toneMapped = false;
                mesh = new THREE.Mesh(dummy_mesh.geometry, material);
                CloneMesh(dummy_mesh);
                break;
            case 4: //Image
                material = new THREE.MeshPhongMaterial({ map: texture, });
                material.toneMapped = false;
                mesh = new THREE.Mesh(dummy_mesh.geometry, material);
                CloneMesh(dummy_mesh);
                break;
            case 5: // Diamond ~ Required specific shape
                mesh = makeDiamond(dummy_mesh.geometry, scene.background, camera, WIDTH, HEIGHT);
                CloneMesh(dummy_mesh);
                break;
            case 6: // Reflection 
                material = new THREE.MeshPhongMaterial({
                    envMap: scene.background,
                    combine: THREE.MixOperation,
                    reflectivity: 1
                })
                mesh = new THREE.Mesh(dummy_mesh.geometry, material);
                CloneMesh(dummy_mesh);
                break;
            case 7: // Refraction 
                material = new THREE.MeshPhysicalMaterial({
                    color: 0xffffff,
                    metalness: 0,
                    roughness: 0.1,
                    transmission: 1,  // Glass-like transparency
                    thickness: 1.0,
                    envMap: scene.background,  // Assuming envMap is defined as above
                });
                mesh = new THREE.Mesh(dummy_mesh.geometry, material);
                CloneMesh(dummy_mesh);
                break;

        }
        if (mat == 4 || mat == 5 || mat == 6 || mat == 7) {
            if (objColor)
                objectFolder.remove(objColor);
            objColor = null;
        }
        else if (!objColor) {
            objColor = objectFolder.addColor({ color: `#${mesh.material.color.getHexString()}` }, 'color').name("Color").onChange((value) => {
                mesh.material.color.set(value);
            });
        }
        if (mat == 5 && !bounces && !ior && !objDiamondColor) {
            var effectController = {
                bounces: 3.0,
                ior: 2.4,
                color: '#ffffff'
            };

            objDiamondColor = objectFolder.addColor(effectController, 'color').name("Color").onChange((value) => {
                effectController.color = value;  // Keep the value as a hex string
                mesh.material.uniforms.color.value = new THREE.Color(value);
            });

            bounces = objectFolder.add(effectController, "bounces", 1.0, 10.0, 1.0).name("Bounces").onChange((value) => {
                effectController.bounces = value;
                mesh.material.uniforms.bounces.value = effectController.bounces;
            });

            ior = objectFolder.add(effectController, "ior", 1.0, 5.0, 0.01).name("IOR").onChange((value) => {
                effectController.ior = value;
                mesh.material.uniforms.ior.value = effectController.ior;
            });

            objectFolder.open();
        }

        else {
            if (bounces) {
                objectFolder.remove(bounces)
                bounces = null;
            }
            if (ior) {
                objectFolder.remove(ior)
                ior = null;
            }
            if (objDiamondColor) {
                objectFolder.remove(objDiamondColor);
                objDiamondColor = null;
            }
        }
        mesh.castShadow = true; // Enable shadow casting
        mesh.receiveShadow = true; // Enable shadow receiving
        scene.add(mesh);
        // render();
    }
}
window.SetSurface = SetSurface

function ImgTexture(url) {
    mesh = scene.getObjectByName("mesh1");
    if (mesh) {
        texture = new THREE.TextureLoader().load(url);
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        SetSurface(4);
    }
}
window.ImgTexture = ImgTexture;

function Translate() {
    if (transControls.mode === 'translate' && transControls.visible) {
        transControls.visible = false;
    } else {
        transControls.visible = true;
        transControls.setMode("translate");
    }
}
window.Translate = Translate;

function Rotate() {
    if (transControls.mode === 'rotate' && transControls.visible) {
        transControls.visible = false;
    } else {
        transControls.visible = true;
        transControls.setMode("rotate");
    }
}
window.Rotate = Rotate;

function Scale() {
    if (transControls.mode === 'scale' && transControls.visible) {
        transControls.visible = false;
    } else {
        transControls.visible = true;
        transControls.setMode("scale");
    }
}
window.Scale = Scale;



export function transform(mesh) {
    transControls.attach(mesh);
    scene.add(transControls);
    // console.log(transControls);
    window.addEventListener('keydown', function (event) {
        switch (event.keyCode) {
            case 84: // T
                Translate();
                break;
            case 82: // R
                Rotate();
                break;
            case 83: // S
                Scale();
                break;
            case 88: // X
                transControls.showX = !transControls.showX;
                break;
            case 89: // Y
                transControls.showY = !transControls.showY;
                break;
            case 90: // Z
                transControls.showZ = !transControls.showZ;
                break;
        }
    });
    transControls.visible = false;
}

function removeLight() {
    const folders = [plFolder, hemisphereFolder, abFolder, dlFolder, slFolder];
    folders.forEach(folder => {
        if (folder && gui.__folders.hasOwnProperty(folder.name)) {
            gui.removeFolder(folder);
        }
    });

    [helper, light, meshPlane].forEach(obj => {
        if (obj && scene.getObjectByName(obj.name)) {
            scene.remove(obj);
        }
    });

    if (translateActive && mesh) {
        transControls.detach(); // Đảm bảo tắt chế độ translate
        transform(mesh); // Chuyển chế độ transform lại cho mesh
        translateActive = false; // Đặt lại biến trạng thái
    }
    LightSwitch = false;
}

function setLight(LightID) {
    if (LightSwitch) {
        removeLight();
    }

    if (meshPlane) {
        meshPlane.receiveShadow = true;
        meshPlane.castShadow = true;
        scene.add(meshPlane);
    }

    switch (LightID) {
        case 1: // Ambient light
            light = new THREE.AmbientLight(0xffffff, 0.5);
            light.toneMapped = false;
            // set up ambient light gui
            const alSettings = { color: light.color.getHex() };
            abFolder = gui.addFolder('Ambient light');
            abFolder.add(light, 'visible');
            abFolder.add(light, 'intensity', 0, 3, 0.1);
            abFolder.addColor(alSettings, 'color').onChange(value => light.color.set(value));
            abFolder.open();
            scene.add(light);
            LightSwitch = true;
            break;

        case 2: // Hemisphere Light
            light = new THREE.HemisphereLight(0xf0e424, 0xd41384, 3);
            light.visible = true;
            // set up hemisphere light gui
            hemisphereFolder = gui.addFolder('HemisphereLight');
            const hlSettings = {
                visible: true,
                color: light.color.getHex(),
                GroundColor: light.groundColor.getHex(),
            };
            hemisphereFolder.add(light, 'visible');
            hemisphereFolder.add(light, 'intensity', 0, 5);
            hemisphereFolder.addColor(hlSettings, 'color').name('sky').onChange(color => light.color.set(color));
            hemisphereFolder.addColor(hlSettings, 'GroundColor').name('ground').onChange(color => light.groundColor.set(color));
            hemisphereFolder.open();
            scene.add(light);
            LightSwitch = true;
            break;

        case 3: // Directional light
            light = new THREE.DirectionalLight(0xffffff, 1);
            light.position.set(-10, 60, 0);
            light.castShadow = true;
            helper = new THREE.DirectionalLightHelper(light, 20);

            // set up directional light gui
            const dlSettings = { visible: true, color: light.color.getHex(), translate: false };
            dlFolder = gui.addFolder('directional light');
            dlFolder.add(light, 'intensity', 0, 5, 0.1);
            dlFolder.add(light.position, 'y', 1, 100, 5);
            dlFolder.add(light, 'castShadow');
            dlFolder.addColor(dlSettings, 'color').onChange(value => light.color.set(value));
            dlFolder.open();
            // shadow settings
            light.shadow.mapSize.width = 1024;
            light.shadow.mapSize.height = 1024;
            light.shadow.camera.left = -200;
            light.shadow.camera.right = 200;
            light.shadow.camera.top = 200;
            light.shadow.camera.bottom = -200;
            light.shadow.camera.near = 0.5;
            light.shadow.camera.far = 500;
            light.shadow.bias = -0.001;
            light.target.position.set(0, 0, 0);
            scene.add(light);
            scene.add(light.target);
            scene.add(helper);
            LightSwitch = true;
            break;

        case 4: // Pointlight
            light = new THREE.PointLight(0xffffff, 5, 100, 0);
            light.position.set(0, 70, 0);
            light.castShadow = true;
            // light.shadow.mapSize.width = 1024;
            // light.shadow.mapSize.height = 1024;
            light.shadow.bias = -0.001;
            helper = new THREE.PointLightHelper(light, 3);

            // set up pointlight gui
            const plSettings = { visible: true, color: light.color.getHex(), translate: false };
            plFolder = gui.addFolder('Point light');
            plFolder.add(light, 'intensity', 0, 10, 1);
            plFolder.add(light, 'distance', 0, 200, 10);
            plFolder.add(plSettings, 'translate').onChange((value) => {
                if (value) {
                    // Bật chế độ translate
                    transControls.setMode('translate');
                    transControls.attach(light);
                    translateActive = true;
                } else {
                    // Tắt chế độ translate
                    transControls.detach();
                    if (mesh) transform(mesh);
                    translateActive = false;
                }
            });
            plFolder.add(light, 'castShadow');
            plFolder.addColor(plSettings, 'color').onChange(value => light.color.set(value));
            plFolder.open();
            scene.add(light);
            scene.add(helper);
            LightSwitch = true;
            break;

        case 5: // Spotlight
            light = new THREE.SpotLight(0xffffff, 4, 100, Math.PI / 1.5, 0, 0);
            light.name = "SpotLight";
            light.position.set(5, 60, 5);
            light.shadow.mapSize.width = 1024;
            light.shadow.mapSize.height = 1024;
            light.shadow.bias = -0.00001;
            light.castShadow = true;
            helper = new THREE.SpotLightHelper(light);

            // set up spotlight gui
            const slSettings = { visible: true, color: light.color.getHex(), translate: false };
            slFolder = gui.addFolder('Spotlight');
            slFolder.add(light, 'intensity', 0, 10, 1); // độ sáng
            slFolder.add(light, 'angle', 0, Math.PI); //góc của chùm sáng
            slFolder.add(light, 'penumbra', 0, 1, 0.1); //mức độ mềm của cạnh chùm sáng
            slFolder.add(light, 'distance', 0, 200, 10); //khoảng cách vùng sáng
            slFolder.add(slSettings, 'translate').onChange((value) => {
                if (value) {
                    // Bật chế độ translate
                    transControls.setMode('translate');
                    transControls.attach(light);
                    translateActive = true;
                } else {
                    // Tắt chế độ translate
                    transControls.detach();
                    if (mesh) transform(mesh);
                    translateActive = false;
                }
            });
            slFolder.add(light, 'castShadow');
            slFolder.addColor(slSettings, 'color').onChange(value => light.color.set(value));
            slFolder.open();
            scene.add(light);
            scene.add(helper);
            LightSwitch = true;
            break;

        case 6: // Reset material
            scene.remove(meshPlane)
            if (mesh) {
                // mesh.material = originalMaterial;
                mesh.material.needsUpdate = true;
            }
            LightSwitch = false;
            break;
    }
}
window.setLight = setLight;


//animation
let time = Date.now();
let id_animation;

const rotationSpeed = 0.01; // Rotation speed
const scaleSpeed = 0.01; // Scaling speed
let isScalingUp = true; // Flag for scaling direction
let alpha = 0;

function startAnimation(animationId) {
    // Cancel the current animation
    cancelAnimationFrame(id_animation);

    // Reset mesh properties if needed
    mesh.rotation.set(0, 0, 0);
    mesh.scale.set(1, 1, 1);
    mesh.position.set(0, 0, 0);
    alpha = 0; // Reset alpha for Animation3

    function animate() {
        const current_time = Date.now();
        const delta_time = current_time - time;
        time = current_time;

        switch (animationId) {
            case 1:
                // Animation 1
                mesh.rotation.x += delta_time * 0.0005;
                mesh.rotation.y += delta_time * 0.002;
                mesh.rotation.z += delta_time * 0.001;
                break;
            case 2:
                // Animation 2
                mesh.rotation.y += rotationSpeed;

                if (isScalingUp) {
                    mesh.scale.x += scaleSpeed;
                    mesh.scale.y += scaleSpeed;
                    mesh.scale.z += scaleSpeed;
                } else {
                    mesh.scale.x -= scaleSpeed;
                    mesh.scale.y -= scaleSpeed;
                    mesh.scale.z -= scaleSpeed;
                }
                // Kiểm tra nếu đối tượng đạt tới giới hạn thu/phóng thì đảo chiều
                if (mesh.scale.x >= 2 || mesh.scale.x <= 0.5) {
                    isScalingUp = !isScalingUp;
                }
                break;
            case 3:
                // Animation 3
                alpha += Math.PI * 0.005;
                if (alpha >= Math.PI * 2) alpha = 0;// Đảm bảo alpha không vượt quá 2π

                mesh.position.x = Math.sin(alpha) * 10;
                mesh.position.z = Math.cos(alpha) * 10;

                mesh.rotation.y += rotationSpeed * 2;
                mesh.rotation.z += rotationSpeed;
                break;
            default:
                console.error("Invalid animation ID");
                return;
        }
        id_animation = requestAnimationFrame(animate);
    }
    animate();
}

window.startAnimation = startAnimation;
function RemoveAllAnimation() {
    cancelAnimationFrame(id_animation);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.set(1, 1, 1);
    mesh.position.set(0, 0, 0);
}
window.RemoveAllAnimation = RemoveAllAnimation;
