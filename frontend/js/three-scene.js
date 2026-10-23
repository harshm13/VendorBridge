/**
 * VendorBridge - ThreeUI Interactive 3D Particle Constellation Mesh
 * Inspired by ThreeUI (https://threeui.com/browse)
 * GPU-accelerated 60FPS particle network with mouse cursor gravity & repulsion
 */

(function () {
    let scene, camera, renderer, particles, particleGeo, particleMat;
    let linesMesh;
    let mouseX = 0, mouseY = 0;
    let windowHalfX = window.innerWidth / 2;
    let windowHalfY = window.innerHeight / 2;
    let targetX = 0, targetY = 0;

    const PARTICLE_COUNT = 85;
    const CONNECT_DISTANCE = 110;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = [];

    function init() {
        const container = document.getElementById('threeCanvasContainer');
        if (!container) return;

        // Check if Three.js is loaded
        if (typeof THREE === 'undefined') {
            console.warn('Three.js not loaded. Falling back to CSS ambient mesh.');
            return;
        }

        // Scene
        scene = new THREE.Scene();

        // Camera
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
        camera.position.z = 320;

        // Renderer
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.domElement.style.position = 'fixed';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.width = '100vw';
        renderer.domElement.style.height = '100vh';
        renderer.domElement.style.pointerEvents = 'none';
        renderer.domElement.style.zIndex = '0';
        renderer.domElement.className = 'three-canvas-layer';
        container.appendChild(renderer.domElement);

        // Particle Geometry
        particleGeo = new THREE.BufferGeometry();

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 550;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 450;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 200;

            velocities.push({
                x: (Math.random() - 0.5) * 0.45,
                y: (Math.random() - 0.5) * 0.45,
                z: (Math.random() - 0.5) * 0.25
            });
        }

        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Particle Material - Electric Cyan / Indigo Glow
        particleMat = new THREE.PointsMaterial({
            color: 0x818cf8,
            size: 3.5,
            transparent: true,
            opacity: 0.75,
            blending: THREE.AdditiveBlending
        });

        particles = new THREE.Points(particleGeo, particleMat);
        scene.add(particles);

        // Lines Geometry for mesh connections
        const lineGeo = new THREE.BufferGeometry();
        const lineMat = new THREE.LineBasicMaterial({
            color: 0x6366f1,
            transparent: true,
            opacity: 0.18,
            blending: THREE.AdditiveBlending
        });

        linesMesh = new THREE.LineSegments(lineGeo, lineMat);
        scene.add(linesMesh);

        // Event Listeners
        window.addEventListener('resize', onWindowResize, false);
        document.addEventListener('mousemove', onDocumentMouseMove, false);

        animate();
    }

    function onWindowResize() {
        windowHalfX = window.innerWidth / 2;
        windowHalfY = window.innerHeight / 2;
        if (camera && renderer) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    function onDocumentMouseMove(event) {
        mouseX = (event.clientX - windowHalfX) * 0.4;
        mouseY = (event.clientY - windowHalfY) * 0.4;
    }

    function animate() {
        requestAnimationFrame(animate);

        targetX += (mouseX - targetX) * 0.03;
        targetY += (mouseY - targetY) * 0.03;

        if (camera) {
            camera.position.x = targetX * 0.3;
            camera.position.y = -targetY * 0.3;
            camera.lookAt(scene.position);
        }

        // Update particle positions
        const pos = particleGeo.attributes.position.array;
        const linePositions = [];

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            pos[i * 3] += velocities[i].x;
            pos[i * 3 + 1] += velocities[i].y;
            pos[i * 3 + 2] += velocities[i].z;

            // Bounce on boundaries
            if (pos[i * 3] < -280 || pos[i * 3] > 280) velocities[i].x *= -1;
            if (pos[i * 3 + 1] < -230 || pos[i * 3 + 1] > 230) velocities[i].y *= -1;
            if (pos[i * 3 + 2] < -100 || pos[i * 3 + 2] > 100) velocities[i].z *= -1;

            // Connect nearby particles
            for (let j = i + 1; j < PARTICLE_COUNT; j++) {
                const dx = pos[i * 3] - pos[j * 3];
                const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
                const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (dist < CONNECT_DISTANCE) {
                    linePositions.push(
                        pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2],
                        pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]
                    );
                }
            }
        }

        particleGeo.attributes.position.needsUpdate = true;

        if (linesMesh) {
            linesMesh.geometry.setAttribute(
                'position',
                new THREE.Float32BufferAttribute(linePositions, 3)
            );
        }

        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
