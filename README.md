# Build manager for OpenSCAD projects

This provides a build script for my more complex OpenSCAD projects

## Prepping a project

The OpenSCAD source should accept a variable called *render_model_name*. If this variable is defined, the script should render only that single part.

    module render_model(render_model_name){
        if(render_model_name=="part_1"){
            part_1();
        }else if(render_model_name=="part_2"){
            part_2();
        }
    }

    if(is_undef(render_model_name)){
        complete_model();
    }else{
        render_model(render_model_name);
    }

## Building a project

Install *node.js* and *npm*. Copy *config.example.json* into the root of your project as *config.json* and edit accordingly. Copy *build.js* from this module into the root of your project and add this line to the *scripts* section of your *package.json*:

    "build": "node build.js"

Generate all of the STLs for the project:

    npm run build

... or render STLs for individual parts by passing the names of each part:

    npm run build part_1 part_2

## Config structure

*config.json* will be in the root of your project. File paths are relative to your project root. All of the below values are required:

* source - this is the main OpenSCAD source file for your project
* parts - flat array of part names in your source file to be rendered
* stl_prefix - the prefix for the generated STL files, can be blank
* max_threads - how many parts to render at once
* render_dir - directory to put the rendered STL files