module.exports = (function(){
	return unique_queue;
})();

function unique_queue(filter){
	this.queue = new Set();
	this.filter = filter;
}

unique_queue.prototype.add = function(new_item){
	for(let item of this.queue){
		if(this.filter(item, new_item)){
			return false;
		}
	}
	
	this.queue.add(new_item);
	return true;
}

unique_queue.prototype.pop = function(){
	let item = [...this.queue].shift();
	this.delete(item);

	return item;
}

unique_queue.prototype.delete = function(item){
	return this.queue.delete(item);
}

unique_queue.prototype.size = function(){
	return this.queue.size;
}