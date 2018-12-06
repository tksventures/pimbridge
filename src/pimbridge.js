const axios = require('axios');

let response;

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
    const pimcoreKey = data.apikey || process.env.PIMCORE_API_KEY;

    return `${pimcoreServer}/webservice/rest/${action}?apikey=${pimcoreKey}${data.extensions || ''}`;
  }

  // We use axios to make the connection to pimcore server
  function connect(method, url, data) {
    return axios({
      url,
      method,
      data,
    })
      .then((res) => {
        if (res.data.success) {
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
  function getUser(apiKey) {
    return connect('get', pimURL('user', apiKey));
  }

  // Retrieves server information
  function serverInfo() {
    return connect('get', pimURL('server-info'));
  }

  // Retrieves a resource based on name and id
  function get(resource, id, params = {}) {
    if (!id) {
      return connect('get', pimURL(`${resource}`));
    }
    let extensions = '';

    if (resource === 'object' && params.inheritance) {
      if (params.inheritance) {
        extensions = `&inheritance=${params.inheritance}`;
      } else {
        extensions = '&inheritance=0';
      }
    }

    if (resource === 'image' && params.light) {
      extensions = `&light=${params.light}`;
    }

    return connect('get', pimURL(`${resource}/id/${id}`, {
      extensions,
    }));
  }

  // Creates a resource based on name of it and parameters provided
  // Requires the following parameters: parentId, key (name) and type
  function create(resource, params) {
    return connect('post', pimURL(resource), params);
  }

  // Updates a resource based on parameters provided
  // Id is not included in url but in the body object
  // Requires the following parameters: parentId, key (name) and type
  async function update(resource, params) {
    if (!params.id) {
      return { error: 'No id provided' };
    }

    // All infor of object needs to be provided in update,
    // so we'll retrieve all customer data prior to applying changes
    const resourceObject = await get(resource, params.id);
    const updates = Object.keys(params);

    // There's nothing to do if id is the only param
    if (updates.length === 1) {
      return true;
    }

    // We replace all the old values with new ones
    for (let x = 0; x < updates.length; x += 1) {
      const thisParam = updates[x];
      resourceObject[thisParam] = params[thisParam];
    }
    response = await connect('put', pimURL('object'), resourceObject);

    if (response.success) {
      return true;
    }

    return response.msg;
  }

  // Deletes resource based on resource type and id provided
  function remove(resource, id) {
    return connect('delete', pimURL(`${resource}/id/${id}`));
  }

  // Searches resources if provided with an array of ids
  // and returns which ones exist and which don't
  // Condense = returns only not existing objects if 1
  function exists(resource, idList, condense = 0) {
    return connect('get', pimURL(`${resource}-inquire`, {
      extensions: `&ids=${idList}&condense=${condense}`,
    }));
  }

  // Searches resources that match a given criteria
  // Default limit of 100

  function search(resource, params = { limit: 100 }, type = 'list') {
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
    }));
  }

  function count(resource, params = null) {
    return search(resource, params, 'count');
  }

  function serverTime() {
    return connect('get', pimURL('system-clock'));
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
