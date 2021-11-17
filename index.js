/// block

// file
request = new XMLHttpRequest();
function load_file(file_path, on_success) {
	request.onreadystatechange = function () {
		if (request.readyState == 4 && (request.status == 0 || request.status == 200)) {
			on_success(request.responseText);
		}
	};
	request.open('GET', file_path);
	request.send();
}

// block id
function build_block_path(block_id) {
	return block_id.toString(16).split("").join('/') + '.json';
}

// block cache
block_cache = new Map();
function load_block(block_id, callback) {
	if (!block_cache.has(block_id)) {
		load_file(build_block_path(block_id), function (reponse) {
			let block = JSON.parse(reponse); block_cache.set(block_id, block); callback(block);
		});
	} else {
		callback(block_cache.get(block_id));
	}
}



/// render

// element
function create(element_type, class_name, child_list = [], callback = function (obj) { }) {
	let obj = document.createElement(element_type); obj.className = class_name;
	for (let child of child_list) { obj.appendChild(child); }
	callback(obj);
}

// list
function create_list_entry_obj(block_id) {
	load_block(block_id, function (block) {
		switch (block.type) {
			case 'text':
				return create('div', 'block-text', [], function (obj) { obj.innerText = block.text; });
			case 'image':
				return create('div', 'image-frame', [
					create('image', 'image-view', [], function (obj) { obj.src = block.data; }),
					create('div', 'image-caption', [], function (obj) { obj.innerText = block.text; })
				]);
			case 'list':
				return create_list_obj(block_id);
			case 'list-ref':
			case 'plane':
				return create('div', 'block-text', [], function (obj) {
					obj.innerText = block.text;
					obj.onclick = function () { load_root_frame(block_id); }
				});
		}
	});
}

function create_list_obj(list, block_id) {
	load_block(block_id, function (block) {
		return create('div', 'list-frame', [
			create('div', 'list-header', [], function (obj) { obj.innerText = block.text; }),
			create('div', 'list-body', [], function (obj) {
				for (let child_block_id of block.list) {
					obj.appendChild(create_list_entry_obj(child_block_id));
				}
			})
		]);
	});
}

// plane
function create_plane_entry_obj(block_info) {
	function set_position(obj) {
		obj.style.left = block_info[0];
		obj.style.top = block_info[1];
		obj.style.width = block_info[2];

	}
	const block_id = block_info[3];
	switch (load_block(block_id).type) {
		case 'list':
			return create('div', 'plane-frame-list', [create_list_obj(block_id)], set_position);
		case 'plane':
			return create('div', 'root-frame-plane', [create_plane_obj(block_id)], set_position);
	}
}

function create_plane_obj(block_id) {
	let block = load_block(block_id);
	return create('div', 'plane-frame', [
		create('div', 'plane-text', [], function (obj) { obj.innerText = block.text; })
	], function (obj) {
		for (let child_block_info of block.list) {
			obj.appendChild(create_plane_entry_obj(child_block_info));
		}
	});
}


// root frame
root_frame_map = new Map();

function show_root_frame(obj) {

}

function create_root_frame(block_id) {
	load_block(block_id, function (block) {
		switch (block.type) {
			case 'list':
				return document.body.appendChild(
					create('div', 'root-frame-list', [
						create('div', 'root-frame-title-bar', [
							create('div', 'root-frame-close-button'),
							create('div', 'root-frame-list-resizer')
						]),
						create_list_obj(block_id)
					])
				);
			case 'plane':
				return document.body.appendChild(
					create('div', 'root-frame-plane', [
						create('div', 'root-frame-title-bar', [
							create('div', 'root-frame-close-button'),
							create('div', 'root-frame-plane-resizer')
						]),
						create_plane_obj(block_id)
					])
				);
		}
	});
}

function load_root_frame(block_id) {
	if (root_frame_map.has(block_id)) {
		show_root_frame(root_frame_map.get(block_id));
	} else {
		root_frame_map.set(block_id, create_root_frame(block_id));
	}
}

// root block
load_file('index.json', function (reponse) {
	load_root_frame(JSON.parse(reponse));
});