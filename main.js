import * as THREE from 'three';
import { TeapotGeometry } from "three/addons/geometries/TeapotGeometry.js";
import { GUI } from "./lib/dat.gui.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
var scene, camera, renderer, mesh, texture;
var transControls;

var LightSwitch = false;
var meshPlane, light, helper, plFolder, abFolder, dlFolder, slFolder, hemisphereFolder;
var gui;
var objColor, objColorGUI, objcolorflag = false;

var transControls, color_bkgr, color_mat = 0xffffff;;
var material;

// Geometry
var BoxG = new THREE.BoxGeometry(30, 30, 30, 40, 40, 40);
var ShereG = new THREE.SphereGeometry(20, 20, 20);
var ConeG = new THREE.ConeGeometry(18, 30, 32, 20);
var CylinderG = new THREE.CylinderGeometry(15, 15, 30, 30, 5);
var TorusG = new THREE.TorusGeometry(20, 5, 20, 100);
var teapotGeo = new TeapotGeometry(16);

var obj_material = new THREE.MeshPhongMaterial({ color: '#ffffff' });

init();
async function init() {
    scene = new THREE.Scene();

    material = new THREE.MeshBasicMaterial({ color: '#ffffff' });

    // Setup scene
    const environment = await new THREE.CubeTextureLoader().loadAsync([
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
    var gridHelper = new THREE.GridHelper(size, divisions, 0xffffff ,0xffffff);
    scene.add(gridHelper);

    renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('webgl').appendChild(renderer.domElement);

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
        const WIDTH = window.innerWidth;
        const HEIGHT = window.innerHeight;

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

    // Light
    light = new THREE.AmbientLight("#FFFFFF", 0.5);
    scene.add(light);

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
        background_points.name ='bkg'
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
function addMesh(id) {
    mesh = scene.getObjectByName("mesh1");
    scene.remove(mesh);

    switch (id) {
        case 1:
            mesh = new THREE.Mesh(BoxG, obj_material);
            break;
        case 2:
            mesh = new THREE.Mesh(ShereG, obj_material);
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
                bevelEnable: true,
                bevelSegments: 2,
                steps: 2,
                bevelSize: 1,
                bevelThickness: 1
            };
            var heart = new THREE.ExtrudeGeometry(getHeart(), extrudeSettings);
            mesh = new THREE.Mesh(heart, obj_material);
            break;
        }
    }

    if (objcolorflag == false) {
        // Thêm objColorGUI vào GUI
        objColor = { color: mesh.material.color.getHex() };
        objColorGUI = gui.addColor(objColor, 'color').name('Object Color');
        // Định nghĩa hàm callback khi màu sắc thay đổi
        objColorGUI.onChange(function (value) {
            mesh.material.color.setHex(value);
            material.color.setHex(value);
        });
        objcolorflag = true;
    }

    mesh.name = "mesh1";
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    scene.add(mesh);
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
    console.log(transControls);
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
    if (LightSwitch) {
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
