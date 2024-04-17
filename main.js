import * as THREE from './lib/three.module.js';
import { TeapotGeometry } from "three/addons/geometries/TeapotGeometry.js";
import { GUI } from "./lib/dat.gui.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

var scene, camera, renderer, mesh;

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
            // const geometry = new THREE.TeapotBufferGeometry();
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


