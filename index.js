/// block

// file
request = new XMLHttpRequest();
function load_file(file_path, on_success){
	request.onreadystatechange = function () {
		if (request.readyState == 4 && (request.status == 0 || request.status == 200)) { 
			on_success(request.responseText); 
		}
	};
	request.open('GET', file_path);
	request.send();
}

// block id
function get_block_path(block_id){
	return block_id.toString(16).split("").join('/') + '.json';
}

// block cache
block_cache = new Map();
function load_block(block_id){
	if(!block_cache.has(block_id)){
		load_file(get_block_path(block_id), function(reponse){
			block_cache.set(block_id, JSON.parse(reponse));
		});
	}
	return block_cache.get(block_id);
}



/// render

// element
function create(element_type, class_name, child_list = [], callback = function(obj){}){
	let obj = document.createElement(element_type); obj.className = class_name;
	for(let child of child_list) { obj.appendChild(child); }
	callback(obj);
}

// list entry
function create_list_entry_obj(block_id){
	let block = load_block(block_id);
	let list_entry = create('div', 'list-entry');
	if(block.type == 'image'){
		block_entry_obj.appendChild(create('image', '', [], function(obj){ obj.src = block.data; }));
	}
	block_entry_obj.appendChild(create('div', 'block-text', [], function(obj){ 
		obj.innerText = block.text; obj.block_id = block_id;
	}));
	return block_entry_obj;
}

function expand_list_entry_obj(obj){
	switch(block.type){
		case 'text': 
		case 'image': 
			break;
		case 'list': 
			for(let child_block_id : block.list){
				obj.appendChild(create_list_entry_obj(child_block_id));
			}
			break;
		case 'plane':
			create_root_frame(obj.block_id);
			break;
	}
}

// plane entry
function create_plane_entry_obj(block_info){
	return (
		create('div', 'plane-frame', [
			create('div', 'block-text', [], function(obj){ obj.innerText = block.text; obj.block_id = block_id; })
		])
	);
}

function create_root_frame(block_id){
	document.body.appendChild(
		create('div', 'root-frame', [
			create('div', 'root-frame-title-bar', [
				create('div', 'root-frame-close-button'),
				create('div', 'root-frame-resize-button')			
			]),
			create_plane_entry_obj(block_id)
		])
	);
}

// load root block
load_file('index.json', function(reponse){
	create_root_frame(JSON.parse(reponse));
});