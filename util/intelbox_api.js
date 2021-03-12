const net_op = require("./net_op");

module.exports = (function(){
	return new intelbox_api();
})();

function intelbox_api(){

}

intelbox_api.prototype.file_upload = async function(content, filename, config){
	return await net_op.common_request({
		url: `${config.URL}/file/upload`,
		method: 'POST',
		json: true,
		formData: {
			file: {
				value: content,
				options: {
					filename: filename
				}
			},
			apikey: `${config.APIKEY}`
		}
	});
}

intelbox_api.prototype.file_report = async function(url, md5, relationship){
	let ret = await net_op.common_request({
        url: `${url}/file/report?file_hash=${md5}&relationship=${relationship}`,
        method: 'GET'
	});
	
    if (ret.success) {
        let data = JSON.parse(ret.body);
        if (data.code == 0) {
            return data.data;
        }
	}
	
	return null;
}

intelbox_api.prototype.ip_report = async function(url, ip, relationship){
	let ret = await net_op.common_request({
        url: `${url}/ip/report?ip=${ip}&relationship=${relationship}`,
        method: 'GET'
    });
	
    if (ret.success) {
        let data = JSON.parse(ret.body);
        if (data.code == 0) {
            return data.data;
        }
	}
	
	return null;
}