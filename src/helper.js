const axios = require('axios');

function helper() {
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
  });
}

module.exports = helper();
