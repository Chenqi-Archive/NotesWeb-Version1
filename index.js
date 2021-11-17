/// block

// file
function load(path) {
	return new Promise((resolve, reject) => {
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
function create(element_type, class_name, child_list = [], callback = function (obj) { }) {
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
			return create('div', 'block-text', [], function (obj) { obj.innerText = block.text; });
		case 'image':
			return create('div', 'image-frame', [
				create('img', 'image-view', [], function (obj) { obj.src = block.data; }),
				create('div', 'image-caption', [], function (obj) { obj.innerText = block.text; })
			]);
		case 'list':
			return await create_list_obj(block_id);
		case 'list-ref':
		case 'plane':
			return create('a', 'block-text', [], function (obj) {
				obj.innerText = block.text;
				obj.onclick = function () { load_root_frame(block_id); }
			});
	}
}

async function create_list_obj(block_id) {
	let block = await load_block(block_id);
	return create('div', 'list-frame', [
		create('div', 'list-header', [], function (obj) { obj.innerText = block.text; }),
	], async function (obj) {
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
	return create('div', 'plane-frame', [
		create('div', 'plane-text', [], function (obj) { obj.innerText = block.text; })
	], async function (obj) {
		for (let child_block_info of block.list) {
			obj.appendChild(await create_plane_entry_obj(child_block_info));
		}
	});
}


// root frame
root_frame_map = new Map();

function show_root_frame(obj) {
	document.body.appendChild(obj);
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

function create_root_frame_title_bar(frame) {
	return create('div', 'root-frame-title-bar', [], obj => set_draggable(obj, frame));
}

function create_root_frame_close_button(frame) {
	return create('div', 'root-frame-close-button', [], obj => obj.onclick = () => destroy_root_frame(frame));
}

async function create_root_frame(block_id) {
	let block = await load_block(block_id);
	switch (block.type) {
		case 'list':
		case 'list-ref':
			return document.body.appendChild(
				create('div', 'root-frame root-frame-list', [], async frame => {
					frame.appendChild(create('div', 'root-frame-view', [
						create_root_frame_title_bar(frame),
						create_root_frame_close_button(frame),
						create('div', 'scroll-frame-list', [await create_list_obj(block_id)])
					]));
					set_resizable(frame);
					frame.onmousedown = () => show_root_frame(frame);
				})
			);
		case 'plane':
			return document.body.appendChild(
				create('div', 'root-frame root-frame-plane', [], async frame => {
					frame.appendChild(create('div', 'root-frame-view', [
						create_root_frame_title_bar(frame),
						create_root_frame_close_button(frame),
						create('div', 'scroll-frame-plane', [await create_plane_obj(block_id)])
					]));
					set_resizable(frame);
				})
			);
	}
}

async function load_root_frame(block_id) {
	if (root_frame_map.has(block_id)) {
		show_root_frame(root_frame_map.get(block_id));
	} else {
		root_frame_map.set(block_id, await create_root_frame(block_id));
	}
}

// root block
window.onload = async () => load_root_frame(JSON.parse(await load('index.json')));