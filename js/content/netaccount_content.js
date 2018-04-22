/**
 * 创建表格自定义行的表头
 * @returns 表头节点
 */
function createHead(){
	var title_th = document.createElement('th');	
	var title_div = document.createElement('div');
	var split_div = document.createElement('div');
	title_div.className = 'th-inner';
	title_div.innerText = 'buptnet估计地址'
	split_div.className = 'fht-cell';
	title_th.appendChild(title_div);
	title_th.appendChild(split_div);
	return title_th;
}

/**
 * 详细账单下，为表格每一行增加估计地址单元格
 */
function billTable(){
	document.querySelector(".bill thead tr").appendChild(createHead());
	var tb = document.querySelectorAll(".bill tbody tr");

	tb.forEach(function (tr){
		var loc_td = document.createElement('td');
		loc_td.innerHTML = buptbase.LocBuptIP(tr.lastChild.innerText);
		tr.appendChild(loc_td);
	});
}
/**
 * 主页在线账单下，为表格每一行增加估计地址单元格
 */
function onlineTable() {
	var th = document.querySelector(".table thead tr");
	th.insertBefore(createHead(), th.childNodes[1]);
	var tb = document.querySelectorAll(".table tbody tr");
	tb.forEach(function (tr) { 
		var loc_td = document.createElement('td');
		var ip_td = tr.childNodes[1];
		loc_td.innerHTML = buptbase.LocBuptIP(ip_td.innerText);
		tr.insertBefore(loc_td, ip_td);
	})
}
/**
 * 根据当前页面选择不同操作
 */
function onLoad() {
	if (document.querySelector('.bill') != null) {
		billTable();
	}
	else if (document.querySelector('.table') != null) {
		onlineTable();
	}
}

onLoad();