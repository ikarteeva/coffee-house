document.querySelector('.close-nav').onclick = closeNav;
document.querySelector('.show-nav').onclick = showNav;

function showNav() {
    document.querySelector('.site-nav').style.left = '0';
}

function closeNav() {
    document.querySelector('.site-nav').style.left = '-300px';
}

/*function getWorkerList(){
    fetch('/get-worker-list',
    {
        method: 'POST'
    }
).then(function(response){
return response.text();
}
).then(function(body){
    console.log(body);
    showWorkerList(JSON.parse(body));
})
}

function showWorkerList(data)
{
    console.log(data);
}

getWorkerList();*/

