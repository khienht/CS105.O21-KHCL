import * as THREE from 'three';
import { TeapotGeometry } from "three/addons/geometries/TeapotGeometry.js";
import { GUI } from "./lib/dat.gui.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { AssetManager } from './diamond/AssetManager.js';
// Post-processing effects from Three.js examples
import { EffectComposer } from 'https://unpkg.com/three@0.142.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.142.0/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://unpkg.com/three@0.142.0/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'https://unpkg.com/three@0.142.0/examples/jsm/postprocessing/SMAAPass.js';
import { GammaCorrectionShader } from 'https://unpkg.com/three@0.142.0/examples/jsm/shaders/GammaCorrectionShader.js';
// Custom shader for additional effects
import { EffectShader } from "./diamond/EffectShader.js";
// For displaying performance stats
import {
    MeshBVH,
    MeshBVHVisualizer,
    MeshBVHUniformStruct,
    FloatVertexAttributeTexture,
    shaderStructs,
    shaderIntersectFunction,
    SAH
} from 'https://unpkg.com/three-mesh-bvh@0.5.10/build/index.module.js';
var scene, camera, renderer, mesh, texture;
var transControls;

var LightSwitch = false;
var meshPlane, light, helper, plFolder, abFolder, dlFolder, slFolder, hemisphereFolder;
var environment;
var gui;
var objColor, objColorGUI, objcolorflag = false;

var transControls, color_bkgr, color_mat = 0xffffff;;
var material;
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
const cubeCamera = new THREE.CubeCamera(1, 100000, cubeRenderTarget);
// Geometry
var BoxG = new THREE.BoxGeometry(30, 30, 30, 40, 40, 40);
var SphereG = new THREE.SphereGeometry(20, 20, 20);
var ConeG = new THREE.ConeGeometry(18, 30, 32, 20);
var CylinderG = new THREE.CylinderGeometry(15, 15, 30, 30, 5);
var TorusG = new THREE.TorusGeometry(20, 5, 20, 100);
var teapotGeo = new TeapotGeometry(16);

// var obj_material = new THREE.MeshPhongMaterial({ color: '#ffffff' });
var obj_material = new THREE.MeshBasicMaterial({ color: '#ffffff' });
const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;
init();
async function init() {
    scene = new THREE.Scene();
    scene.add(cubeCamera);
    cubeCamera.position.set(0, 5, 0);


    material = new THREE.MeshBasicMaterial({ color: '#ffffff' });

    // Setup scene
    environment = await new THREE.CubeTextureLoader().loadAsync([
        "diamond/skybox/Box_Right.bmp",
        "diamond/skybox/Box_Left.bmp",
        "diamond/skybox/Box_Top.bmp",
        "diamond/skybox/Box_Bottom.bmp",
        "diamond/skybox/Box_Front.bmp",
        "diamond/skybox/Box_Back.bmp"
    ]);
    environment.encoding = THREE.sRGBEncoding;
    scene.background = environment;

    // Camera
    var camera_x = 30;
    var camera_y = 50;
    var camera_z = 100;
    camera = new THREE.PerspectiveCamera(75,
        window.innerWidth / innerHeight, 1, 1000);
    camera.position.set(camera_x, camera_y, camera_z);
    camera.lookAt(scene.position);

    // Grid
    var size = 300;
    var divisions = 40;
    var gridHelper = new THREE.GridHelper(size, divisions, 0xffffff, 0xffffff);
    scene.add(gridHelper);

    renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('webgl').appendChild(renderer.domElement);
    cubeCamera.update(renderer, scene);


    // Controls
    var controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    transControls = new TransformControls(camera, renderer.domElement);
    transControls.size = 0.5;
    transControls.addEventListener("dragging-changed", (event) => {
        controls.enabled = !event.value;
    });
    transControls.addEventListener('change', render);

    // Resize handler
    function onWindowResize() {
        WIDTH = window.innerWidth;
        HEIGHT = window.innerHeight;

        camera.aspect = WIDTH / HEIGHT;
        camera.updateProjectionMatrix();

        renderer.setSize(WIDTH, HEIGHT);
    }

    //GUI control
    {
        gui = new GUI({
            autoPlace: false
        });
        let customContainer = document.getElementById("my-gui-container");
        customContainer.appendChild(gui.domElement);
        gui.updateDisplay();
    }

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

    // Init plane for showing shadow
    const planeGeo = new THREE.PlaneGeometry(size, size);
    const planeMat = new THREE.MeshStandardMaterial({
        // color: "#15151e",
        side: THREE.DoubleSide,
    });
    {
        meshPlane = new THREE.Mesh(planeGeo, planeMat);
        meshPlane.receiveShadow = true;
        meshPlane.rotation.x = -Math.PI / 2;
    }
    // gridHelper.add(meshPlane);

    window.addEventListener('resize', onWindowResize, false);
    controls.update();
    render();

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

    if (id == 1) { // dark
        var bkg = scene.getObjectByName("bkg");
        scene.remove(bkg);

        if (currentEnvironment) {
            currentEnvironment.dispose();
        }

        const environment = await new THREE.CubeTextureLoader().loadAsync([
            "diamond/skybox/Box_Right.bmp",
            "diamond/skybox/Box_Left.bmp",
            "diamond/skybox/Box_Top.bmp",
            "diamond/skybox/Box_Bottom.bmp",
            "diamond/skybox/Box_Front.bmp",
            "diamond/skybox/Box_Back.bmp"
        ]);
        environment.encoding = THREE.sRGBEncoding;

        currentEnvironment = environment;
        scene.background = environment;

    } else { // light
        // color_bkgr = 0xffffff;
        // color_bkgr = 0x000000;
        if (currentEnvironment) {
            currentEnvironment.dispose();
            currentEnvironment = null;
        }
        scene.background = new THREE.Color(0x000000);

        var background_points = create_background_point();
        background_points.name = 'bkg'
        scene.add(background_points);
        // color_mat = 0xffffff;
        // color_mat = 0x707070;
    }
    material.color.set(obj_material);

    // scene.background = new THREE.Color(color_bkgr);
}
// function ChangeBackGround(id) {

//     if (id == 1) { // dark
//         color_bkgr = 0x000000;
//         // color_mat = 0xffffff;
//     } else { // light
//         color_bkgr = 0xffffff;
//         // color_mat = 0x707070;
//     }
//     material.color.set(obj_material);

//     scene.background = new THREE.Color(color_bkgr);
// }
window.ChangeBackGround = ChangeBackGround;


function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
}

function updateCamera() {
    camera.updateProjectionMatrix();
    render();
}

//draw geometry
async function addMesh(id) {
    // Remove the existing mesh
    let mesh = scene.getObjectByName("mesh1");
    if (mesh) {
        scene.remove(mesh);
    }

    // Switch case to create new mesh based on id
    switch (id) {
        case 1:
            mesh = new THREE.Mesh(BoxG, obj_material);
            break;
        case 2:
            mesh = new THREE.Mesh(SphereG, obj_material);
            break;
        case 3:
            mesh = new THREE.Mesh(ConeG, obj_material);
            break;
        case 4:
            mesh = new THREE.Mesh(CylinderG, obj_material);
            break;
        case 5:
            mesh = new THREE.Mesh(TorusG, obj_material);
            break;
        case 6:
            mesh = new THREE.Mesh(teapotGeo, obj_material);
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
            break;
        }
        case 8:
            const diamondGeo = (await AssetManager.loadGLTFAsync("diamond/diamond.glb")).scene.children[0].children[0].children[0].children[0].children[0].geometry;;
            diamondGeo.scale(20, 20, 20);
            mesh = new THREE.Mesh(diamondGeo, obj_material); // Use diamond geometry directly
            break;
    }

    // Add color GUI if it hasn't been added already
    if (!objcolorflag) {
        objColor = { color: mesh.material.color.getHex() };
        objColorGUI = gui.addColor(objColor, 'color').name('Object Color');
        objColorGUI.onChange((value) => {
            mesh.material.color.setHex(value);
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
    render();
}

window.addMesh = addMesh;

function removeGeometry() {
    if (scene.getObjectById(mesh.id) !== undefined && transControls.object && objcolorflag == true) {
        scene.remove(mesh);
        gui.remove(objColorGUI);
        transControls.detach();
        renderer.render(scene, camera);
        RemoveAllAnimation();
    } else {
        console.log("Mesh không tồn tại trong scene.");
    }
    objcolorflag = false;
}
window.removeGeometry = removeGeometry;

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
function makeDiamond(geo, {
    color = new THREE.Color(1, 1, 1),
    ior = 2.4
} = {}) {
    const mergedGeometry = geo;
    mergedGeometry.boundsTree = new MeshBVH(mergedGeometry.toNonIndexed(), { lazyGeneration: false, strategy: SAH });
    const collider = new THREE.Mesh(mergedGeometry);
    collider.material.wireframe = true;
    collider.material.opacity = 0.5;
    collider.material.transparent = true;
    collider.visible = false;
    collider.boundsTree = mergedGeometry.boundsTree;
    scene.add(collider);
    const visualizer = new MeshBVHVisualizer(collider, 20);
    visualizer.visible = false;
    visualizer.update();
    scene.add(visualizer);
    const diamond = new THREE.Mesh(geo, new THREE.ShaderMaterial({
        uniforms: {
            envMap: { value: environment },
            bvh: { value: new MeshBVHUniformStruct() },
            bounces: { value: 3 },
            color: { value: color },
            ior: { value: ior },
            correctMips: { value: true },
            projectionMatrixInv: { value: camera.projectionMatrixInverse },
            viewMatrixInv: { value: camera.matrixWorld },
            chromaticAberration: { value: true },
            aberrationStrength: { value: 0.01 },
            resolution: { value: new THREE.Vector2(WIDTH, HEIGHT) }
        },
        vertexShader: /*glsl*/ `
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    uniform mat4 viewMatrixInv;
    void main() {
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        vNormal = (viewMatrixInv * vec4(normalMatrix * normal, 0.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
    }
    `,
        fragmentShader: /*glsl*/ `
    precision highp isampler2D;
    precision highp usampler2D;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    uniform samplerCube envMap;
    uniform float bounces;
    ${shaderStructs}
    ${shaderIntersectFunction}
    uniform BVH bvh;
    uniform float ior;
    uniform vec3 color;
    uniform bool correctMips;
    uniform bool chromaticAberration;
    uniform mat4 projectionMatrixInv;
    uniform mat4 viewMatrixInv;
    uniform mat4 modelMatrix;
    uniform vec2 resolution;
    uniform bool chromaticAbberation;
    uniform float aberrationStrength;
    vec3 totalInternalReflection(vec3 ro, vec3 rd, vec3 normal, float ior, mat4 modelMatrixInverse) {
        vec3 rayOrigin = ro;
        vec3 rayDirection = rd;
        rayDirection = refract(rayDirection, normal, 1.0 / ior);
        rayOrigin = vWorldPosition + rayDirection * 0.001;
        rayOrigin = (modelMatrixInverse * vec4(rayOrigin, 1.0)).xyz;
        rayDirection = normalize((modelMatrixInverse * vec4(rayDirection, 0.0)).xyz);
        for(float i = 0.0; i < bounces; i++) {
            uvec4 faceIndices = uvec4( 0u );
            vec3 faceNormal = vec3( 0.0, 0.0, 1.0 );
            vec3 barycoord = vec3( 0.0 );
            float side = 1.0;
            float dist = 0.0;
            bvhIntersectFirstHit( bvh, rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist );
            vec3 hitPos = rayOrigin + rayDirection * max(dist - 0.001, 0.0);
           // faceNormal *= side;
            vec3 tempDir = refract(rayDirection, faceNormal, ior);
            if (length(tempDir) != 0.0) {
                rayDirection = tempDir;
                break;
            }
            rayDirection = reflect(rayDirection, faceNormal);
            rayOrigin = hitPos + rayDirection * 0.01;
        }
        rayDirection = normalize((modelMatrix * vec4(rayDirection, 0.0)).xyz);
        return rayDirection;
    }
    void main() {
        mat4 modelMatrixInverse = inverse(modelMatrix);
        vec2 uv = gl_FragCoord.xy / resolution;
        vec3 directionCamPerfect = (projectionMatrixInv * vec4(uv * 2.0 - 1.0, 0.0, 1.0)).xyz;
        directionCamPerfect = (viewMatrixInv * vec4(directionCamPerfect, 0.0)).xyz;
        directionCamPerfect = normalize(directionCamPerfect);
        vec3 normal = vNormal;
        vec3 rayOrigin = cameraPosition;
        vec3 rayDirection = normalize(vWorldPosition - cameraPosition);
        vec3 finalColor;
        if (chromaticAberration) {
        vec3 rayDirectionR = totalInternalReflection(rayOrigin, rayDirection, normal, max(ior * (1.0 - aberrationStrength), 1.0), modelMatrixInverse);
        vec3 rayDirectionG = totalInternalReflection(rayOrigin, rayDirection, normal, max(ior, 1.0), modelMatrixInverse);
        vec3 rayDirectionB = totalInternalReflection(rayOrigin, rayDirection, normal, max(ior * (1.0 + aberrationStrength), 1.0), modelMatrixInverse);
        float finalColorR = textureGrad(envMap, rayDirectionR, dFdx(correctMips ? directionCamPerfect: rayDirection), dFdy(correctMips ? directionCamPerfect: rayDirection)).r;
        float finalColorG = textureGrad(envMap, rayDirectionG, dFdx(correctMips ? directionCamPerfect: rayDirection), dFdy(correctMips ? directionCamPerfect: rayDirection)).g;
        float finalColorB = textureGrad(envMap, rayDirectionB, dFdx(correctMips ? directionCamPerfect: rayDirection), dFdy(correctMips ? directionCamPerfect: rayDirection)).b;
        finalColor = vec3(finalColorR, finalColorG, finalColorB) * color;
        } else {
            rayDirection = totalInternalReflection(rayOrigin, rayDirection, normal, max(ior, 1.0), modelMatrixInverse);
            finalColor = textureGrad(envMap, rayDirection, dFdx(correctMips ? directionCamPerfect: rayDirection), dFdy(correctMips ? directionCamPerfect: rayDirection)).rgb;
            finalColor *= color;
        }
        gl_FragColor = vec4(vec3(finalColor), 1.0);
    }
    `
    }));
    diamond.material.uniforms.bvh.value.updateFrom(collider.boundsTree);
    diamond.castShadow = true;
    diamond.receiveShadow = true;
    return diamond;
}
// change surface
function SetSurface(mat) {
    mesh = scene.getObjectByName("mesh1");
    if (mesh) {
        const dummy_mesh = mesh.clone();
        scene.remove(mesh);

        switch (mat) {
            case 1: //Point
                material = new THREE.PointsMaterial({ color: mesh.material.color, size: 0.8 });
                mesh = new THREE.Points(dummy_mesh.geometry, material);
                CloneMesh(dummy_mesh);
                break;
            case 2: //Line
                material = new THREE.LineBasicMaterial({ color: mesh.material.color });
                mesh = new THREE.Line(dummy_mesh.geometry, material);
                CloneMesh(dummy_mesh);
                break;
            case 3: //Solid
                material = new THREE.MeshBasicMaterial({ color: mesh.material.color });
                mesh = new THREE.Mesh(dummy_mesh.geometry, material);
                CloneMesh(dummy_mesh);
                break;
            case 4: //Image
                material = new THREE.MeshBasicMaterial({ map: texture, });
                mesh = new THREE.Mesh(dummy_mesh.geometry, material);
                CloneMesh(dummy_mesh);
                break;
            case 5: // Diamond
                mesh = makeDiamond(dummy_mesh.geometry);
                CloneMesh(dummy_mesh);
                break;

        }
        render();
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

// Affine transformation
function Translate() {
    transControls.setMode("translate");
}
window.Translate = Translate;

function Rotate() {
    transControls.setMode("rotate");
}
window.Rotate = Rotate;

function Scale() {
    transControls.setMode("scale");
}
window.Scale = Scale;

function transform(mesh) {
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
}

function removeLight() {
    if (scene.getObjectByName("mesh1")) {
        mesh = scene.getObjectByName("mesh1");
        obj_material = new THREE.MeshBasicMaterial({ color: '#ffffff' });
        mesh.material = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    }
    if (plFolder && gui.__folders.hasOwnProperty(plFolder.name)) {
        gui.removeFolder(plFolder);
    }
    if (hemisphereFolder && gui.__folders.hasOwnProperty(hemisphereFolder.name)) {
        gui.removeFolder(hemisphereFolder);
    }
    if (abFolder && gui.__folders.hasOwnProperty(abFolder.name)) {
        gui.removeFolder(abFolder);
    }
    if (dlFolder && gui.__folders.hasOwnProperty(dlFolder.name)) {
        gui.removeFolder(dlFolder);
    }
    if (slFolder && gui.__folders.hasOwnProperty(slFolder.name)) {
        gui.removeFolder(slFolder);
    }
    scene.remove(helper);
    scene.remove(light);
    scene.remove(meshPlane);
}

function setLight(LightID) {
    if (LightSwitch) {
        removeLight();
    }
    switch (LightID) {
        case 1:	//Ambient light
            light = new THREE.AmbientLight(0xffffff, 0.5);
            // set up ambient light gui
            {
                const alSettings = { color: light.color.getHex() };
                abFolder = gui.addFolder('Ambient light');
                abFolder.add(light, 'visible');
                abFolder.add(light, 'intensity', 0, 3, 0.1);
                abFolder
                    .addColor(alSettings, 'color')
                    .onChange((value) => light.color.set(value));
                abFolder.open();
            }

            scene.add(light);
            LightSwitch = true;
            break;

        case 2: //Hemisphere Light
            light = new THREE.HemisphereLight(0xf0e424, 0xd41384, 3);
            light.visible = true;
            // set up hemispherelight gui
            {
                hemisphereFolder = gui.addFolder('HemisphereLight');
                const hlSettings = {
                    visible: true,
                    color: light.color.getHex(),
                    GroundColor: light.groundColor.getHex(),
                };
                hemisphereFolder.add(light, 'visible');
                hemisphereFolder.add(light, 'intensity', 0, 5);
                hemisphereFolder.addColor(hlSettings, 'color')
                    .name('sky')
                    .onChange(color => {
                        light.color.set(color);
                    });
                hemisphereFolder.addColor(hlSettings, 'GroundColor')
                    .name('ground')
                    .onChange(color => {
                        light.groundColor.set(color);
                    });
                hemisphereFolder.open();
            }
            LightSwitch = true;
            scene.add(light);
            break;

        case 3: //Directional light
            light = new THREE.DirectionalLight(0xffffff, 1);
            light.position.set(-5, 60, -4);
            light.castShadow = true;
            helper = new THREE.DirectionalLightHelper(light, 20);
            // set up directional light gui
            {
                const dlSettings = {
                    visible: true,
                    color: light.color.getHex(),
                };
                dlFolder = gui.addFolder('directional light');
                dlFolder.add(light, 'intensity', 0, 5, 0.1);
                dlFolder.add(light.position, 'y', 1, 100, 5);
                dlFolder.add(light, 'castShadow');
                dlFolder.add(light.position, 'x', -100, 100, 5);
                dlFolder.add(light.position, 'y', -10, 100, 5);
                dlFolder.add(light.position, 'z', -100, 100, 5);
                dlFolder
                    .addColor(dlSettings, 'color')
                    .onChange((value) => light.color.set(value));
                dlFolder.open();
            }

            {
                light.shadow.mapSize.width = 1024;
                light.shadow.mapSize.height = 1024;
                light.shadow.camera.left = -200;
                light.shadow.camera.right = 200;
                light.shadow.camera.top = 200;
                light.shadow.camera.bottom = -200;
                light.shadow.camera.near = 0.5;
                light.shadow.camera.far = 500;
                light.shadow.bias = 0.0001;
                light.target.position.set(-5, 0, 0);
            }

            LightSwitch = true;
            scene.add(light);
            scene.add(light.target);
            scene.add(helper);
            break;
        case 4: //Pointlight
            light = new THREE.PointLight(0xffffff, 5, 100, 0);
            light.position.set(0, 60, 0);
            light.castShadow = true;

            {
                light.shadow.camera.near = 0.1;
                light.shadow.camera.far = 12;
                light.shadow.mapSize.width = 1024;
                light.shadow.mapSize.height = 1024;
                light.shadow.bias = 0.0001;
            }

            helper = new THREE.PointLightHelper(light, 3);
            // set up pointlight gui
            {
                const plSettings = {
                    visible: true,
                    color: light.color.getHex(),
                };
                plFolder = gui.addFolder('Point light');
                plFolder.add(light, 'intensity', 0, 10, 1);
                plFolder.add(light, 'distance', 0, 200, 10);
                plFolder.add(light.position, 'x', -300, 300, 5);
                plFolder.add(light.position, 'y', -10, 100, 5);
                plFolder.add(light.position, 'z', -300, 300, 5);
                plFolder.add(light, 'castShadow');
                plFolder
                    .addColor(plSettings, 'color')
                    .onChange((value) => light.color.set(value));
                plFolder.open();
            }

            scene.add(light);
            scene.add(helper);
            LightSwitch = true;
            break;
        case 5:	//Spotlight
            light = new THREE.SpotLight(0xffffff, 5, 100, Math.PI / 1.5, 0, 0);
            light.name = "SpotLight";
            light.position.set(5, 60, 5);
            light.castShadow = true;
            light.shadow.bias = 0.0001;
            helper = new THREE.SpotLightHelper(light);
            // set up spotlight gui
            {
                const slSettings = {
                    visible: true,
                    color: light.color.getHex(),
                };
                slFolder = gui.addFolder('Spotlight');
                slFolder.add(light, 'intensity', 0, 10, 1);
                slFolder.add(light, 'angle', 0, Math.PI);
                slFolder.add(light, 'penumbra', 0, 1, 0.1);
                slFolder.add(light, 'distance', 0, 200, 10);
                slFolder.add(light.position, 'x', -300, 300, 5);
                slFolder.add(light.position, 'y', -10, 100, 5);
                slFolder.add(light.position, 'z', -300, 300, 5);
                slFolder.add(light, 'castShadow');
                slFolder
                    .addColor(slSettings, 'color')
                    .onChange((value) => light.color.set(value));
                slFolder.open();
            }

            scene.add(light);
            scene.add(helper);
            LightSwitch = true;
            break;
        case 6:
            LightSwitch = false;
            break;
    }

    if (LightSwitch) {
        if (scene.getObjectByName("mesh1")) {
            mesh = scene.getObjectByName("mesh1");
            obj_material = new THREE.MeshPhongMaterial({ color: '#ffffff' });
            mesh.material = new THREE.MeshPhongMaterial({ color: '#ffffff' });
        }
        meshPlane.receiveShadow = true;
        scene.add(meshPlane);
    }
    render();
}
window.setLight = setLight;
// update camera
function setFOV(value) {
    camera.fov = Number(value);
    camera.updateProjectionMatrix();
    render();
}
window.setFOV = setFOV;

function setFar(value) {
    camera.far = Number(value);
    camera.updateProjectionMatrix();
    render();
}
window.setFar = setFar;

function setNear(value) {
    camera.near = Number(value);
    camera.updateProjectionMatrix();
    render();
}
window.setNear = setNear;

//animation
let time = Date.now();

mesh = scene.getObjectByName("mesh1");
var id_animation1, id_animation2, id_animation3;

function Animation1() {
    const current_time = Date.now();
    const delta_time = current_time - time;

    time = current_time;

    cancelAnimationFrame(id_animation3);
    cancelAnimationFrame(id_animation2);
    cancelAnimationFrame(id_animation1);
    mesh.rotation.x += delta_time * 0.0005;
    mesh.rotation.y += delta_time * 0.002;
    mesh.rotation.z += delta_time * 0.001;

    console.log("Animation 1");
    id_animation1 = requestAnimationFrame(Animation1);
    renderer.render(scene, camera);
}
window.Animation1 = Animation1

var rotationSpeed = 0.01; // Tốc độ xoay
var scaleSpeed = 0.01; // Tốc độ thu/phóng
var isScalingUp = true; // Cờ để xác định trạng thái thu/phóng

function Animation2() {
    cancelAnimationFrame(id_animation3);
    cancelAnimationFrame(id_animation2);
    cancelAnimationFrame(id_animation1);
    // Xoay đối tượng
    mesh.rotation.y += rotationSpeed;

    // Thu/phóng đối tượng
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

    console.log("Animation 2");
    id_animation2 = requestAnimationFrame(Animation2);
    renderer.render(scene, camera);
}
window.Animation2 = Animation2

var alpha = 0;
function Animation3() {
    cancelAnimationFrame(id_animation3);
    cancelAnimationFrame(id_animation2);
    cancelAnimationFrame(id_animation1);

    alpha += Math.PI * 0.005;
    if (alpha >= Math.PI * 2) alpha = 0; // Đảm bảo alpha không vượt quá 2π

    mesh.position.x = Math.sin(alpha) * 10;
    mesh.position.z = Math.cos(alpha) * 10;

    const rotationSpeed = 0.02;
    mesh.rotation.y += rotationSpeed;
    mesh.rotation.z += rotationSpeed * 0.5;

    console.log("Animation 3");
    id_animation3 = requestAnimationFrame(Animation3);
    renderer.render(scene, camera);
}
window.Animation3 = Animation3

function RemoveAllAnimation() {
    cancelAnimationFrame(id_animation1);
    cancelAnimationFrame(id_animation2);
    cancelAnimationFrame(id_animation3);
    mesh.rotation.set(0, 0, 0);
    render();
}
window.RemoveAllAnimation = RemoveAllAnimation;
