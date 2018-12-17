const _ = require('lodash');
const helper = require('./helper');

function Pimbridge(pimcoreAccess = {}) {
  // Pimcore server and apiKey can be set by env variables or as parameters

  // This function converts keywords or versions of resource name into the
  // Pimcore acceptable resource name for its API
  const singularize = {
    'tag-elements': 'tag-element',
    'tags-elements': 'tag-element',
    'elements-tags': 'elements-tag',
    assets: 'asset',
    documents: 'document',
    objects: 'object',
    tags: 'tag',
  };

  // Generates the url pimcore needs to find resource
  // Apikey is required in all requests, so this automates it's insertion
  function pimURL(action, data = { apikey: pimcoreAccess.apikey || process.env.PIMCORE_API_KEY }) {
    const pimcoreServer = pimcoreAccess.url || process.env.PIMCORE_URL;
    const pimcoreKey = data.apikey || pimcoreAccess.apikey || process.env.PIMCORE_API_KEY;

    return `${pimcoreServer}/webservice/rest/${action}?apikey=${pimcoreKey}${data.extensions || ''}`;
  }

  // ===========================================================
  // BASIC API FUNCTIONS
  // - These are the default web services offered by Pimcore
  // ===========================================================

  // Retrieves info of user with given apiKey
  function getUser(apikey, callback) {
    return helper.connect('get', pimURL('user', { apikey }), {}, callback);
  }

  // Retrieves server information
  function serverInfo(callback) {
    return helper.connect('get', pimURL('server-info'), {}, callback);
  }

  // Retrieves a resource based on name and id
  function get(resource, id, params = {}, callback) {
    // If no id is provided, then it gets for the resource directly
    if (!id) {
      return helper.connect('get', pimURL(`${resource}`), {}, callback);
    }
    let extensions = '';

    if (resource === 'object' && params.inheritance) {
      if (params.inheritance) {
        extensions = `&inheritance=${params.inheritance}`;
      } else {
        extensions = '&inheritance=0';
      }
    }

    if (resource === 'asset' && params.light) {
      extensions = `&light=${params.light}`;
    }

    return helper.connect('get', pimURL(`${resource}/id/${id}`, {
      extensions,
    }), {}, callback);
  }

  // Creates a resource based on name of it and parameters provided
  // Requires the following parameters: parentId, key (name) and type
  function create(resource, params, callback) {
    return helper.connect('post', pimURL(resource), params, callback);
  }

  // Updates a resource based on parameters provided
  // Id is not included in url but in the body object
  // Requires the following parameters: parentId, key (name) and type
  async function update(resource, params, callback) {
    if (!params.id) {
      return 'No id provided';
    }

    // All infor of object needs to be provided in update,
    // so we'll retrieve all customer data prior to applying changes
    const resourceObject = (await get(resource, params.id)).data;
    const updates = Object.keys(params);

    // There's nothing to do if id is the only param
    if (updates.length === 1) {
      return 'Nothing to update';
    }

    // We replace all the old values with new ones
    for (let x = 0; x < updates.length; x += 1) {
      const thisParam = updates[x];
      resourceObject[thisParam] = params[thisParam];
    }

    return helper.connect('put', pimURL('object'), resourceObject, callback);
  }

  // Deletes resource based on resource type and id provided
  function remove(resource, id, callback) {
    return helper.connect('delete', pimURL(`${resource}/id/${id}`), {}, callback);
  }

  // Searches resources if provided with an array of ids
  // and returns which ones exist and which don't
  // Condense = returns only not existing objects if 1
  function exists(resource, idList, condense = 0, callback) {
    return helper.connect('get', pimURL(`${resource}-inquire`, {
      extensions: `&ids=${idList}&condense=${condense}`,
    }), {}, callback);
  }

  // Searches resources that match a given criteria
  // Default limit of 100
  function search(resource, params = { limit: 100 }, type = 'list', callback) {
    let resourceName;
    if (singularize[resource]) {
      resourceName = singularize[resource];
    } else {
      resourceName = resource;
    }
    let extensions = '';
    if (params) {
      const paramsList = Object.keys(params);

      for (let x = 0; x < paramsList.length; x += 1) {
        const param = paramsList[x];
        if (param === 'q') {
          extensions += `&${param}=${JSON.stringify(params[param])}`;
        } else {
          extensions += `&${param}=${params[param]}`;
        }
      }
    }
    return helper.connect('get', pimURL(`${resourceName}-${type}`, {
      extensions,
    }), {}, callback);
  }

  // Counts records of given resource
  function count(resource, params = null, callback) {
    return search(resource, params, 'count', callback);
  }

  // Returns server time
  function serverTime(callback) {
    return helper.connect('get', pimURL('system-clock'), {}, callback);
  }


  // ===========================================================
  // ENHANCEMENTS
  // - These are Pimcore methods not offered in the default API
  // ===========================================================

  // This makes a shallow copy of a single resource of Pimcore
  async function shallowCopy(resource, params) {
    if (!params.id || !params.parentId) {
      return { error: true, message: 'Missing id or parentId' };
    }
    const response = await get(resource, params.id);

    if (!response.success) {
      return response;
    }

    const original = response.data;
    const copiedObject = _.clone(response.data);
    delete copiedObject.id;
    delete copiedObject.path;

    copiedObject.parentId = params.parentId;

    if (params.childs) {
      copiedObject.childs = params.childs;
    }

    if (params.key) {
      copiedObject.key = params.key;
    }

    // If parameter of preview or addChildren is given,
    // then we don't create a new folder with previous data
    // but instead return state of resource with changes
    if (params.preview || params.addChildren) {
      return { original, copy: copiedObject, success: true };
    }

    const copyResponse = await create(resource, copiedObject);

    if (!copyResponse.success) {
      copyResponse.original = original;
      return copyResponse;
    }

    return { original, success: true, id: copyResponse.id };
  }

  // This method can copy a resource with its direct children if the
  // parameter children is included
  // It can also attach direct children of a resource if the
  // parameter addChildren is provided
  async function copy(resource, params, callback) {
    let parentId;
    // We default our parentId to the one given in params
    ({ parentId } = params);

    // We will make a copy of the resource first (if not in preview or addChildren mode)
    const parentCopy = (await shallowCopy(resource, params));

    // If the resource failed to be copied or has no children, then we are done
    if (!parentCopy.success || (!params.children && !params.addChildren)) {
      if (parentCopy.success && callback) {
        return callback(parentCopy);
      }
      return parentCopy;
    }

    // If we are addChildren is not set but children is, then we reassign the parentId
    if (!params.addChildren) {
      parentId = parentCopy.id;
    }

    // We take the children from the data retrieved from copy method
    const { childs } = parentCopy.original;

    // We will need to execute this method inside each child
    async function copyChild(child) {
      const childParams = {
        parentId,
        id: child.id,
      };
      return shallowCopy(resource, childParams);
    }

    // We use our helper to loop in the child list and execute the above method
    const childResponses = await helper.loopAndExec(childs, copyChild);
    childResponses.id = parentId; // We include id of parent copy

    // We return our response. It will contain and object with error and success keys telling us
    // if any child was not copied
    if (callback) {
      return callback(childResponses);
    }
    return childResponses;
  }

  return Object.freeze({
    pimURL,
    get,
    create,
    update,
    remove,
    exists,
    search,
    count,
    getUser,
    serverInfo,
    serverTime,
    shallowCopy,
    copy,
  });
}

module.exports = Pimbridge;
