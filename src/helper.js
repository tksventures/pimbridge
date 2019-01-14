const axios = require('axios');
const _ = require('lodash');

function helper() {
  // We use this function to properly handle errors from axios and error responses from Pimcore
  function handleError(
    error,
    defaultMessage = 'There was an error',
    errorMessagePath = 'response.data.msg',
  ) {
    let message;
    const fullError = _.get(error, 'response.data', error);

    message = _.get(error, errorMessagePath, defaultMessage);

    // If we are dealing with an axios error, we return its error message if provided
    if (errorMessagePath === 'axios-error' && error.message) {
      ({ message } = error);
    }

    return ({ message, fullError, error: true });
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

        return handleError(res, 'Request error');
      })
      .catch(error => (handleError(error, 'Connection error', 'axios-error')));
  }

  async function loopAndExec(listing, func) {
    const responses = {
      success: [],
      errors: [],
    };

    const rawResponses = [];

    for (let x = 0; x < listing.length; x += 1) {
      const thisElement = listing[x];
      const thisResponse = func(thisElement);
      rawResponses.push(thisResponse);
    }

    const data = await Promise.all(rawResponses);

    for (let x = 0; x < data.length; x += 1) {
      const thisElement = data[x];

      if (thisElement.success) {
        responses.success.push(thisElement);
      } else {
        responses.errors.push(thisElement);
      }
    }

    responses.success_total = responses.success.length;
    responses.errors_total = responses.errors.length;

    return responses;
  }


  return Object.freeze({
    connect,
    loopAndExec,
    handleError,
  });
}

module.exports = helper();
