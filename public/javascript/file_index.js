var currentdir

$(function() {

  var file_browser = $('#file_browser');

  file_browser.filedrop({
    url: 'upload',
    paramname: 'file',
    maxfiles: 10, // Number of files a user can upload concurrently
    maxfilesize: 10, // Max file size (in MB)
    error: function(err, file) {
      switch(err) {
          case 'BrowserNotSupported':
              alert('browser does not support html5 drag and drop');
              break;
          case 'TooManyFiles':
              alert('Too many files');
              // user uploaded more than 'maxfiles'
              break;
          case 'FileTooLarge':
              alert('File is too large');
              // program encountered a file whose size is greater than 'maxfilesize'
              // FileTooLarge also has access to the file which was too large
              // use file.name to reference the filename of the culprit file
              break;
          default:
              break;
      }
    }

  }); // end file_browser.filedrop


  $('#file_browser').ready(function() {
    clicked("");
  });
});
/*window.onpopstate = function(event) {  
  alert("location: " + document.location + ", state: " + JSON.stringify(event.state));  
};
*/  
function clicked(filename) {
  var req = $.ajax({
    type: 'POST',
    url : '/click',
    data: { 'path' : filename }
   });

  req.done(function(data) {
   if (data && data.files) {
     $('#file_browser_content').html(data.files);
     $('.clickable').bind('click', function() {
            clicked(this.id);
        });
      if (filename != "") {
        setDir(data.currentdir + filename + "/");
      }
   } 
   else if(data && data.url){         
     var iframe = document.createElement("iframe");
     console.error('wow');
     iframe.src = data.url;
     iframe.style.display = 'none';
     document.body.appendChild(iframe);
   }
});

function setDir(directory) {
  var req = $.ajax({
    type: 'POST',
    url : '/setdir',
    data: { 'path' : directory }
  });

  req.done(function (data) {
    //place holder
  });
};