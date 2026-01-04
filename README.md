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

Install *node.js* and *npm*. Generate all of the STLs for the project:

    npm run build

... or render STLs for individual parts by passing the names of each part:

    npm run build part_1 part_2
