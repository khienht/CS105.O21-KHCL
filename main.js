import * as THREE from './lib/three.module.js';
import { TeapotGeometry } from "three/addons/geometries/TeapotGeometry.js";
import { GUI } from "./lib/dat.gui.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";

var scene, camera, renderer, mesh, texture;
var transControls;
var type_material = 3;

// Geometry
var BoxG = new THREE.BoxGeometry(30,30,30,40,40,40);
var ShereG = new THREE.SphereGeometry(20,20,20);
var ConeG = new THREE.ConeGeometry(18,30,32,20);
var CylinderG = new THREE.CylinderGeometry(20,20,40,30,5);
var TorusG = new THREE.TorusGeometry(20, 5, 20, 100);
var teapotGeo = new TeapotGeometry(20);

var material = new THREE.MeshBasicMaterial({color: '#ffffff'});
material.needsUpdate = true;

init();
function init(){
    scene = new THREE.Scene();

    // Camera
    var camera_x = 1;
    var camera_y = 50;
    var camera_z = 100;
    camera = new THREE.PerspectiveCamera(75,
                                window.innerWidth/innerHeight,0.1,1000);
    camera.position.set(camera_x,camera_y,camera_z);
    camera.lookAt(scene.position);
    
    // Grid
    var size = 300;
    var divisions = 50;
    var gridHelper = new THREE.GridHelper(size,divisions, 0x888888);
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
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    window.addEventListener('resize', onWindowResize, false);
    controls.update();
    render();
    
}

function render(){
    requestAnimationFrame(render);
    
    renderer.render(scene, camera);
}

//vẽ hình
function addMesh(id){
    mesh = scene.getObjectByName("mesh1");
    scene.remove(mesh);

    switch(id){
        case 1: 
            mesh = new THREE.Mesh(BoxG,material);
            break;
        case 2:
            mesh = new THREE.Mesh(ShereG,material);
            break;
        case 3:
            mesh = new THREE.Mesh(ConeG,material);
            break;
        case 4:
            mesh = new THREE.Mesh(CylinderG,material);
            break;
        case 5:
            mesh = new THREE.Mesh(TorusG,material);
            break;
        case 6:
            mesh = new THREE.Mesh(teapotGeo,material);
            break;
        case 7:{
            const extrudeSettings = { 
                amount: 2, 
                bevelEnable: true, 
                bevelSegments: 2, 
                steps: 2, 
                bevelSize: 1, 
                bevelThickness: 1 };
            var heart = new THREE.ExtrudeGeometry(getHeart(), extrudeSettings);
            mesh = new THREE.Mesh(heart,material);
            break;
        }
            
    }
    
    mesh.name = "mesh1";
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    scene.add(mesh);
    transform(mesh);
    render();
}
window.addMesh = addMesh;

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

function CloneMesh(dummy_mesh){
    mesh.name = dummy_mesh.name;
    mesh.position.set(dummy_mesh.position.x, dummy_mesh.position.y, dummy_mesh.position.z);
    mesh.rotation.set(dummy_mesh.rotation.x, dummy_mesh.rotation.y, dummy_mesh.rotation.z);
    mesh.scale.set(dummy_mesh.scale.x, dummy_mesh.scale.y, dummy_mesh.scale.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    transform(mesh);
}

function SetSurface(mat){
    mesh = scene.getObjectByName("mesh1");
    if (mesh){
        const dummy_mesh = mesh.clone();
        scene.remove(mesh);

        switch (mat){
            case 1: //Point
                material = new THREE.PointsMaterial({color: '#ffffff',size: 0.5});
                mesh = new THREE.Points(dummy_mesh.geometry,material);
                CloneMesh(dummy_mesh);
                break;
            case 2: //Line
                material = new THREE.LineBasicMaterial({ color: '#ffffff' });
                mesh = new THREE.Line(dummy_mesh.geometry, material);
                CloneMesh(dummy_mesh);
                break;
            case 3: //Solid
                material = new THREE.MeshBasicMaterial({ color: '#ffffff' });
                mesh = new THREE.Mesh(dummy_mesh.geometry, material);
                CloneMesh(dummy_mesh);
                break;
            case 4: //Image
                material = new THREE.MeshBasicMaterial({ map: texture,  });
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

// Affine
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
    window.addEventListener('keydown', function(event) {
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