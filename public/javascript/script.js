$(function() {

  var dropbox = $('#dropbox');

  dropbox.filedrop({
    url: 'upload',
    paramname: 'file',
    maxfiles: 10, // Number of files a user can upload concurrently
    maxfilesize: 10, // Max file size (in MB)
    error: function(err, file) {
      switch(err) {
          case 'BrowserNotSupported':
              alert('browser does not support html5 drag and drop')
              break;
          case 'TooManyFiles':
              // user uploaded more than 'maxfiles'
              break;
          case 'FileTooLarge':
              // program encountered a file whose size is greater than 'maxfilesize'
              // FileTooLarge also has access to the file which was too large
              // use file.name to reference the filename of the culprit file
              break;
          default:
              break;
      }
    },
    
  });
});