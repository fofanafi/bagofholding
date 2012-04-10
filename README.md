Bag of Holding
==============

User login
----------
Initially, we will follow the kludge used in the midterm, where user records are stored in a JSON dictionary.  The entire data structure containing user information will be written to disk whenever it is modified. In later versions of the project, we will implement authenticatoin via OAuth or some similar mechanism if we have the time.

File storage
------------
We will use the node.js fs module to interact directly with the underlying filesystem. One of our first goals is to implement an HTTP interface for uploading, downloading, modifying, and deleting files. Once this interface is defined, we can begin dividing up work between client and server-side development. 

