document.querySelector('#coffee-order').onsubmit = function (event) {
    event.preventDefault();
    let ident = document.querySelector('#ident').value.trim();
    let email = document.querySelector('#email').value.trim();

    /*if (document.querySelector('#rule').checked) {
        //переменная waytopay NN
    }*/

    if (ident == '' || email == '') {
        Swal.fire({
            title : 'Внимание!',
            text: 'Заполнены не все поля',
            type: 'info',
            confirmButtonText: 'Ок'
        });
        return false;
    }

    fetch('/finish-order', {
        method: 'POST',
        body: JSON.stringify({
            'id1': ident,
            'email': email,
            'key': JSON.parse(localStorage.getItem('cart'))
        }),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    })
        .then(function (response) {
            return response.text();
        })
        .then(function (body) {
            if (body == 1) {
                Swal.fire({
                    title : 'Успешно!',
                    text: 'Заказ успешно сохранен!',
                    type: 'info',
                    confirmButtonText: 'Ок'
                });

            }
            else {
                Swal.fire({
                    title : 'Проблема с почтой',
                    text: 'Произошла ошибка',
                    type: 'error',
                    confirmButtonText: 'Ок'
                });
            }
        })
}