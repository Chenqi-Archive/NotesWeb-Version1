/// block

// file
function load(path) {
	return new Promise(resolve => {
		let request = new XMLHttpRequest();
		request.onload = () => { resolve(request.responseText); };
		request.open('GET', path); request.send();
	});
}

// block id
function build_block_path(block_id) {
	return block_id.toString(16).split("").join('/') + '.json';
}

// block cache
block_cache = new Map();
async function load_block(block_id) {
	if (!block_cache.has(block_id)) {
		let reponse = await load(build_block_path(block_id));
		let block = JSON.parse(reponse); block_cache.set(block_id, block);
		return block;
	}
	return block_cache.get(block_id);
}


/// render

// element
function create(element_type, class_name, child_list = [], callback = obj => {}) {
	let obj = document.createElement(element_type); obj.className = class_name;
	for (let child of child_list) { obj.appendChild(child); }
	callback(obj);
	return obj;
}

// list
async function create_list_entry_obj(block_id) {
	let block = await load_block(block_id);
	switch (block.type) {
		case 'text':
			return create('div', 'block-text', [], obj => obj.innerText = block.text);
		case 'image':
			return create('div', 'image-frame', [
				create('img', '', [], obj => obj.src = block.data),
				create('div', 'image-caption', [], obj => obj.innerText = block.text)
			]);
		case 'list':
			return await create_list_obj(block_id);
		case 'list-ref':
		case 'plane':
			return create('a', 'block-text', [], obj => {
				obj.innerText = block.text;
				obj.onclick = () => load_root_frame(block_id);
			});
	}
}

async function create_list_obj(block_id) {
	let block = await load_block(block_id);
	return create('div', 'list-view', [
		create('div', 'list-header', [], obj => obj.innerText = block.text),
	], async obj => {
		for (let child_block_id of block.list) {
			obj.appendChild(await create_list_entry_obj(child_block_id));
		}
	});
}

// plane
async function create_plane_entry_obj(block_info) {
	function set_position(obj) {
		obj.style.left = block_info[0];
		obj.style.top = block_info[1];
		obj.style.width = block_info[2];
	}
	let block_id = block_info[3];
	let block = await load_block(block_id);
	switch (block.type) {
		case 'list':
		case 'list-ref':
			return create('div', 'plane-frame plane-frame-list', [await create_list_obj(block_id)], set_position);
		case 'plane':
			return create('div', 'plane-frame plane-frame-plane', [await create_plane_obj(block_id)], set_position);
	}
}

async function create_plane_obj(block_id) {
	let block = await load_block(block_id);
	return create('div', '', [
		create('div', 'plane-text', [], obj => obj.innerText = block.text)
	], async obj => {
		for (let child_block_info of block.list) {
			obj.appendChild(await create_plane_entry_obj(child_block_info));
		}
	});
}


// root frame
root_frame_map = new Map();
max_z_index = 1;
function show_root_frame(obj) {
	obj.style.zIndex = max_z_index++;
}

function destroy_root_frame(obj) {
	root_frame_map.delete(obj.block_id);
	document.body.removeChild(obj);
}

function set_draggable(bar, frame) {
	bar.onmousedown = event => {
		event.preventDefault();
		var down_x = event.clientX, down_y = down_y = event.clientY;
		document.onmousemove = event => {
			let curr_x = event.clientX, curr_y = event.clientY;
			frame.style.left = frame.offsetLeft + curr_x - down_x;
			frame.style.top = frame.offsetTop + curr_y - down_y;
			down_x = curr_x; down_y = curr_y;
		};
		document.onmouseup = () => {
			document.onmousemove = null;
			document.onmouseup = null;
		}
	};
}

function set_resizable(frame) {
	frame.appendChild(create('div', 'root-frame-border-right', [], obj => set_resizable_position(obj, true, false)));
	frame.appendChild(create('div', 'root-frame-border-bottom', [], obj => set_resizable_position(obj, false, true)));
	frame.appendChild(create('div', 'root-frame-border-rightbottom', [], obj => set_resizable_position(obj, true, true)));
	function set_resizable_position(border, right, bottom) {
		border.onmousedown = event => {
			event.preventDefault();
			var down_x = event.clientX, down_y = event.clientY, down_width = frame.offsetWidth, down_height = frame.offsetHeight;
			document.onmousemove = event => {
				let curr_x = event.clientX, curr_y = event.clientY;
				if (right) { frame.style.width = down_width + curr_x - down_x; }
				if (bottom) { frame.style.height = down_height + curr_y - down_y; }
			};
			document.onmouseup = () => {
				document.onmousemove = null;
				document.onmouseup = null;
			}
		}
	};
}

async function create_root_frame(block_id) {
	let frame = create('div', 'root-frame'); frame.block_id = block_id;
	let frame_view = create('div', 'root-frame-view', [
		create('div', 'root-frame-title-bar', [], obj => set_draggable(obj, frame)),
		block_id == root_block_id ?
			create('div', '') :
			create('div', 'root-frame-close-button', [], obj => obj.onclick = () => destroy_root_frame(frame))
	]);
	frame.appendChild(frame_view);
	frame.onmousedown = () => show_root_frame(frame); set_resizable(frame);
	let block = await load_block(block_id);
	switch (block.type) {
		case 'list':
		case 'list-ref':
			frame.classList.add('root-frame-list');
			frame_view.appendChild(create('div', 'scroll-frame scroll-frame-list', [await create_list_obj(block_id)]));
			break;
		case 'plane':
			frame.classList.add('root-frame-plane');
			frame_view.appendChild(create('div', 'scroll-frame scroll-frame-plane', [await create_plane_obj(block_id)]));
			break;
	}
	return document.body.appendChild(frame);
}

async function load_root_frame(block_id) {
	if (!root_frame_map.has(block_id)) {
		root_frame_map.set(block_id, await create_root_frame(block_id));
	}
	show_root_frame(root_frame_map.get(block_id));
}

// root block
root_block_id = 0;
window.onload = async () => load_root_frame(root_block_id = JSON.parse(await load('index.json')));