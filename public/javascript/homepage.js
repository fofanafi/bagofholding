// Sets the homepage form to create a new user
function create() {
    document.getElementById("form").action = "new_user";
    document.getElementById("submitForm").value = "Create new bag of holding"
    document.getElementById("login").style.boxShadow = "inset -2px -2px 5px #aaa";
    document.getElementById("create").style.boxShadow = "none";
}


// Sets the homepage form to login
function login() {
    document.getElementById("form").action = "authenticate";
    document.getElementById("submitForm").value = "Open my bag of holding"
    document.getElementById("login").style.boxShadow = "";
    document.getElementById("create").style.boxShadow = "inset 2px -2px 5px #aaa";
};


function removePassword() {
    document.getElementById("password").value = "";
};


function removeUsername() {
    document.getElementById("username").value = "";
};