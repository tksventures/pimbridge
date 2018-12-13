# Pimbridge
A Pimcore adapter meant to simplify work with its [API](https://pimcore.com/docs/5.x/Development_Documentation/Web_Services) and provide new methods.

### Prerequisites

You will need access to a Pimcore server and a valid API key to access this server.

### Installing

```
npm install pimbridge
```
This will install the package

```
Pimbridge = require('pimbridge');

pimcore = Pimbridge({
    url: 'http://pimcore_server',
    apikey: 'apikey',
});
```
This will let you use our package's methods through the pimcore object.

Alternatively, the url and apikey can be provided via the PIMCORE_URL and PIMCORE_API_KEY environment variables without the need to enter them as parameters.

### Running the tests
When developing extensions to the package, run the following command locally.

```
npm test
```

## Basic functions
- All api methods return promises so you will need to handle them as such in your code.
- If an error occurs, and object will be returned with an error param of true and a fullError param showing the full response from pimcore.
- If no error occurs, the default pimcore response will be returned unless a callback function was provided as a parameter.

The following aware the most prominent methods from the library:

### getUser(apikey, callback)
```
pimcoreUser = await pimcore.getUser()
// or
pimcoreUser = await pimcore.getUser('someapikey');
```
This returns the information of the pimcore user based on the api provided. By default, it will return the key provided in the environment or the creation of pimcore object, but api keys can be provided.


### get(resource, id, params, callback)
```
document await pimcore.get('document', 3);

asset = await pimcore.get('asset', 4, { light: 0 });

object = await pimcore.get('object', 1281, { inheritance: 0 });
```
The get() method retrieves resources from one of the three main pimcore folders: documents, assets, and objects. Basic params format follows (resouce, id of resource, parameters).

### create(resource, params, callback)
```
response = await pimcore.create('object', {
  parentId: 1,
  type: 'folder',
  key: 'pimcore-folder',
})

// response => { success: true, id: 12345 }
```
Basic creation action. The above created a folder in the objects section with a name of 'pimcore-folder'.

### update(resource, params, callback)
```
response = await pimcore.update('object', {
  id: 12345,
  key: 'pimcore-other-folder',
})

// response => { success: true, data: null }
```
Basic update action. The above change the name of a folder we created before to 'pimcore-other-folder'

### remove(resource, id, callback)
```
object = await pimcore.remove('object', 12479);

// response => { success: true, data: null }
```
Basic delete action. The above will delete the folder we created and updated before

### search(resource, params, type='list', callback)

```
objects = pimcore.search('objects', {
  offset: 100,
  limit: 100,
  objectClass: 'ProductCategory',
});

assets = await pimcore.search('assets', {
  order: 'DESC',
  orderKey: 'id',
  limit: 10,
});

/* objects => { 
  success: true,
  total: 3,
  data: 
   [ { id: 123, type: 'object', published: true },
     { id: 134, type: 'object', published: true },
     { id: 156, type: 'object', published: true },
   ],
  }
*/
```

Basic search option. Limit parameter reduces the scope of the search and offset changes the start of it. First  function will start search at the 100th element  and will search for ProductCategory type objects in the next 100 elements. order and orderKey can be set as per second example.

### copy(resource, params, callback)

```
object = pimcore.copy('object', {
  id: 12, // object you want to copy
  parentId: 1234, // object you want to copy to
});

/* object => { 
  success: true,
  id: 'idOfNewObject',
  original: {}, // Data of object that was copied 
  }
*/


object = pimcore.copy('object', {
  id: 12,
  parentId: 1234,
  children: true, // indicates you want to copy direct children
});


/* 
If children are copied, the following response is returned
object => { 
  success: [Array], // Responses of children that were copied
  errors: [Array], // Responses of children that failed to be copied
  success_total: 2,
  errors_total: 3,
  id: idOfParentFolder', // Where children were copied to
}
*/

Copy tool. It copies a resource into a new parent as per parameters given. Can copy direct children if provided with a children or addChildren parameter. The first parameter will copy the base folder and its direct children into the new parentFolder. The second parameter will indicate that only children are to be copied.