"""Render a locally exported living-room GLB using Blender 4.5 LTS."""

import argparse
from pathlib import Path
import sys

import bpy
from mathutils import Matrix, Vector


def point(x, y, z):
    return Vector((x * 0.3048, -z * 0.3048, y * 0.3048))


def aim(obj, target):
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def area(name, position, target, energy, size, color):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = point(*position)
    aim(obj, point(*target))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--samples", type=int, default=96)
    parser.add_argument("--width", type=int, default=1600)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    if not args.source.is_file():
        raise FileNotFoundError(args.source)
    if args.samples < 1 or args.width < 64:
        raise ValueError("Samples must be positive and width at least 64 pixels.")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(args.source.resolve()))
    imported = list(bpy.context.scene.objects)
    for obj in imported:
        if obj.parent is None:
            obj.matrix_world = Matrix.Scale(0.3048, 4) @ obj.matrix_world
    bpy.context.view_layer.update()

    # Keep modeled colors and texture maps; add small-scale surface relief.
    upholstery = set()
    for obj in imported:
        if "Sectional" in obj.name:
            upholstery.update(slot.material for slot in obj.material_slots if slot.material)
    for material in bpy.data.materials:
        if not material.use_nodes:
            continue
        nodes = material.node_tree.nodes
        shader = next((node for node in nodes if node.type == "BSDF_PRINCIPLED"), None)
        if shader is None:
            continue
        name = material.name.lower()
        if material in upholstery:
            shader.inputs["Roughness"].default_value = 0.48
            scale, strength, distance = 190, 0.18, 0.0007
        elif "stone" in name:
            scale, strength, distance = 65, 0.32, 0.0015
        elif "oak" in name:
            scale, strength, distance = 110, 0.15, 0.0006
        else:
            continue
        texture = nodes.new("ShaderNodeTexNoise")
        texture.inputs["Scale"].default_value = scale
        texture.inputs["Detail"].default_value = 3
        bump = nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = strength
        bump.inputs["Distance"].default_value = distance
        material.node_tree.links.new(texture.outputs["Fac"], bump.inputs["Height"])
        material.node_tree.links.new(bump.outputs["Normal"], shader.inputs["Normal"])

    # A render-only ceiling closes the browser's open-top inspection model.
    bpy.ops.mesh.primitive_cube_add(size=1, location=point(9.5, 9.12, 17.3875))
    ceiling = bpy.context.object
    ceiling.name = "Render-only ceiling - nominal 9 ft datum"
    ceiling.dimensions = (19 * 0.3048, 18.775 * 0.3048, 0.2 * 0.3048)
    finish = bpy.data.materials.new("Render-only matte white ceiling")
    finish.diffuse_color = (0.82, 0.80, 0.75, 1)
    ceiling.data.materials.append(finish)

    world = bpy.data.worlds.new("Neutral daylight")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.72, 0.82, 1, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.35
    scene = bpy.context.scene
    scene.world = world
    area("Daylight through west windows", (-2, 6, 17.475), (6, 3, 17.475), 1300, 4, (1, 0.93, 0.82))
    area("Daylight through return windows", (6.6, 6, 6), (7, 2, 17), 1100, 3, (0.85, 0.92, 1))
    area("Soft interior bounce", (16, 8, 21), (3, 2, 17), 180, 3, (1, 0.85, 0.68))
    area("Fireplace warm glow", (1.7, 2.5, 17.475), (7, 1, 17.475), 18, 0.6, (1, 0.28, 0.045))

    camera_data = bpy.data.cameras.new("Living-room photographic camera")
    camera = bpy.data.objects.new(camera_data.name, camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = point(17, 5.5, 24)
    aim(camera, point(2.5, 3.8, 16.5))
    camera_data.lens = 23
    camera_data.clip_start = 0.03
    scene.camera = camera
    scene.render.engine = "CYCLES"
    scene.cycles.samples = args.samples
    scene.cycles.use_denoising = True
    scene.cycles.seed = 24
    scene.render.resolution_x = args.width
    scene.render.resolution_y = round(args.width * 0.625)
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(args.output.resolve())
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.render.film_transparent = False
    for image in bpy.data.images:
        if image.source == "FILE" and image.has_data:
            image.pack()
    blend = args.output.with_suffix(".blend")
    bpy.ops.wm.save_as_mainfile(filepath=str(blend.resolve()))
    bpy.ops.render.render(write_still=True)
    if not args.output.is_file():
        raise RuntimeError("Cycles did not produce the requested PNG.")
    print(f"RENDER_COMPLETE: {args.output.resolve()}")


if __name__ == "__main__":
    main()
