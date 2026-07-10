import React, { useRef, useEffect } from 'react'
import * as THREE from 'three';

export default function LegalScene3D() {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x111216)

    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000)
    camera.position.set(0, 1.2, 3)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(renderer.domElement)

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8)
    hemi.position.set(0, 20, 0)
    scene.add(hemi)

    const dir = new THREE.DirectionalLight(0xffffff, 0.6)
    dir.position.set(5, 10, 7.5)
    scene.add(dir)

    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshStandardMaterial({ color: 0x2ea3f2 })
    const cube = new THREE.Mesh(geometry, material)
    cube.rotation.x = 0.4
    cube.rotation.y = 0.4
    scene.add(cube)

    const planeGeo = new THREE.PlaneGeometry(10, 10)
    const planeMat = new THREE.MeshStandardMaterial({ color: 0x0e0f12 })
    const plane = new THREE.Mesh(planeGeo, planeMat)
    plane.rotation.x = -Math.PI / 2
    plane.position.y = -0.5
    scene.add(plane)

    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    let req = null
    const clock = new THREE.Clock()
    const animate = () => {
      req = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()
      cube.rotation.y = t * 0.6
      cube.position.y = Math.sin(t * 1.5) * 0.1
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(req)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      planeGeo.dispose()
      planeMat.dispose()
      if (renderer.domElement && container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '400px', overflow: 'hidden' }} aria-hidden="true" />
  )
}
