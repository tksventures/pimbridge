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

function callbackFunction(pimcoreRes) {
  return ({ callbackMade: true, response: pimcoreRes });
}

describe('Helper', () => {
  beforeEach(() => {
    // We set mock env variables for the module
    mock = new MockAdapter(axios);

    mock.onAny().reply(config => returnData(config));
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
