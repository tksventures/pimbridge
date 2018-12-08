const axios = require('axios');

function Pimbridge(pimcoreAccess = {}) {
  // Pimcore server and apiKey can be set by env variables or as parameters
  // Generates the url pimcore needs to find resource
  // Apikey is required in all requests, so this automates it's insertion

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

  function pimURL(action, data = { apikey: pimcoreAccess.apikey || process.env.PIMCORE_API_KEY }) {
    const pimcoreServer = pimcoreAccess.url || process.env.PIMCORE_URL;
    const pimcoreKey = data.apikey || pimcoreAccess.apikey || process.env.PIMCORE_API_KEY;

    return `${pimcoreServer}/webservice/rest/${action}?apikey=${pimcoreKey}${data.extensions || ''}`;
  }

  // We use axios to make the connection to pimcore server
  function connect(method, url, data, callback) {
    return axios({
      url,
      method,
      data,
    })
      .then((res) => {
        if (res.data.success) {
          // If callback exists, it is executed with axios response as a param
          if (callback) {
            return callback(res.data);
          }
          return res.data;
        }
        return ({ error: true, message: res.data.msg });
      })
      .catch(error => ({
        error: true,
        message: error.response.data.msg,
        fullError: error.response.data,
      }));
  }
  // =======================================================
  // BASIC API FUNCTIONS
  // - These are the default web services offered by Pimcore
  // =======================================================

  // Retrieves info of user with given apiKey
  function getUser(apikey, callback) {
    return connect('get', pimURL('user', { apikey }), {}, callback);
  }

  // Retrieves server information
  function serverInfo(callback) {
    return connect('get', pimURL('server-info'), {}, callback);
  }

  // Retrieves a resource based on name and id
  function get(resource, id, params = {}, callback) {
    // If no id is provided, then it gets for the resource directly
    if (!id) {
      return connect('get', pimURL(`${resource}`), {}, callback);
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

    return connect('get', pimURL(`${resource}/id/${id}`, {
      extensions,
    }), {}, callback);
  }

  // Creates a resource based on name of it and parameters provided
  // Requires the following parameters: parentId, key (name) and type
  function create(resource, params, callback) {
    return connect('post', pimURL(resource), params, callback);
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

    return connect('put', pimURL('object'), resourceObject, callback);
  }

  // Deletes resource based on resource type and id provided
  function remove(resource, id, callback) {
    return connect('delete', pimURL(`${resource}/id/${id}`), {}, callback);
  }

  // Searches resources if provided with an array of ids
  // and returns which ones exist and which don't
  // Condense = returns only not existing objects if 1
  function exists(resource, idList, condense = 0, callback) {
    return connect('get', pimURL(`${resource}-inquire`, {
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
    return connect('get', pimURL(`${resourceName}-${type}`, {
      extensions,
    }), {}, callback);
  }

  // Counts records of given resource
  function count(resource, params = null, callback) {
    return search(resource, params, 'count', callback);
  }

  // Returns server time
  function serverTime(callback) {
    return connect('get', pimURL('system-clock'), {}, callback);
  }

  return Object.freeze({
    connect,
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
  });
}

module.exports = Pimbridge;
