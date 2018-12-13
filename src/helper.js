const axios = require('axios');

function Helper() {
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

    for (let x = 0; x < listing.length; x += 1) {
      const thisElement = listing[x];
      // eslint-disable-next-line no-await-in-loop
      const thisResponse = await func(thisElement);
      if (thisResponse.success) {
        responses.success.push(thisResponse);
      } else {
        responses.errors.push(thisResponse);
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

module.exports = Helper();
