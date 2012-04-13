// Sets the homepage form to login
function login() {
    var form = document.getElementById("form");
    form.action = "authenticate";

    var loginTab = document.getElementById("login");
    var createTab = document.getElementById("create");

    loginTab.style.boxShadow = "";
    createTab.style.boxShadow = "inset 2px -2px 5px #aaa";
};

// Sets the homepage form to create a new user
function create() {
    var form = document.getElementById("form");
    form.action = "new_user";

    var loginTab = document.getElementById("login");
    var createTab = document.getElementById("create");

    loginTab.style.boxShadow = "inset -2px -2px 5px #aaa";
    createTab.style.boxShadow = "none";
}