import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import helper from '../../src/helper';

let mock;
let response;

function returnData(config, data = { id: 'something', type: 'folder' }) {
  const rType = config.method.toUpperCase();
  return ([200, {
    data,
    request: config,
    success: true,
    msg: `${rType} request was made`,
  }]);
}

function returnError(config, errorObject) {
  if (!errorObject) {
    return ([500, {
      config,
      code: 'ECONNREFUSED',
    }]);
  }

  return errorObject;
}

function callbackFunction(pimcoreRes) {
  return ({ callbackMade: true, response: pimcoreRes });
}

describe('helper', () => {
  beforeEach(() => {
    // We set mock env variables for the module
    mock = new MockAdapter(axios);

    mock.onAny().reply(config => returnData(config));
  });

  describe('handleError', () => {
    beforeEach(() => {
      mock = new MockAdapter(axios);
      mock.onGet('/system_error').networkError();
      mock.onGet('/axios_request').reply(config => returnError(config));
    });

    it('should return error key of true, full error and default message if not provided with one', async () => {
      try {
        response = await axios.get('/system_error');
      } catch (e) {
        response = helper.handleError(e); // With all default values
      }

      expect(response.error).toBe(true);
      expect(response.fullError).not.toBe(undefined);
      expect(response.message).toBe('There was an error'); // Default message
    });

    it('should return custom message if one is provided', async () => {
      try {
        response = await axios.get('/system_error');
      } catch (e) {
        response = helper.handleError(e, 'Axios connection error');
      }

      expect(response.error).toBe(true);
      expect(response.message).toBe('Axios connection error'); // Default message
    });

    it('should return message with error code if is an axios request and code is available', async () => {
      try {
        response = await axios.get('/axios_request');
      } catch (e) {
        response = helper.handleError(e, 'Axios connection error', 'axios-error');
      }

      expect(response.error).toBe(true);
      expect(response.message).toBe('Request failed with status code 500');
      expect(response.fullError).not.toBe(undefined);
      expect(response.fullError.code).toBe('ECONNREFUSED');
    });
  });

  describe('connect', () => {
    it('should return make call to axios based on method, url and data given', async () => {
      response = await helper.connect('get', '/test');
      expect(response.msg).toBe('GET request was made');

      response = await helper.connect('post', '/test');
      expect(response.msg).toBe('POST request was made');

      response = await helper.connect('put', '/test');
      expect(response.msg).toBe('PUT request was made');

      response = await helper.connect('delete', '/test');
      expect(response.msg).toBe('DELETE request was made');
    });

    it('should return callback function response if provided as parameter', async () => {
      response = await helper.connect('get', '/test', {}, callbackFunction);
      expect(response.callbackMade).toBe(true);
      expect(response.response.msg).toBe('GET request was made');
    });

    it('should return error if connection is unsuccessful', async () => {
      mock = new MockAdapter(axios);
      mock.onAny('/failed').reply(config => returnError(config));

      response = await helper.connect('get', '/failed');
      expect(response.error).toBe(true);
      expect(response.message).toBe('Request failed with status code 500');

      response = await helper.connect('post', '/failed', {}, callbackFunction);
      expect(response.error).toBe(true);
      expect(response.message).toBe('Request failed with status code 500');

      response = await helper.connect('put', '/failed', {}, callbackFunction);
      expect(response.error).toBe(true);
      expect(response.message).toBe('Request failed with status code 500');

      response = await helper.connect('delete', '/failed', {}, callbackFunction);
      expect(response.error).toBe(true);
      expect(response.message).toBe('Request failed with status code 500');
    });
  });

  describe('loopAndExec', () => {
    it('should execute a certain method in every element of a list', async () => {
      const listing = [
        {
          amount: 0,
        },
        {
          amount: 45,
        },
        {
          amount: 65,
        },
      ];
      const results = [];

      function increaseAmount(element) {
        results.push(element.amount + 13);
        return { success: true };
      }

      response = await helper.loopAndExec(listing, increaseAmount);

      expect(response.success_total).toBe(3);
      expect(results[0]).toBe(13);
      expect(results[1]).toBe(58);
      expect(results[2]).toBe(78);
    });
  });
});
