// Sets the homepage form to login
function login() {
    var form = document.getElementById("form");
    form.action = "authenticate";
};

// Sets the homepage form to create a new user
function create() {
    var form = document.getElementById("form");
    form.action = "new_user";
}