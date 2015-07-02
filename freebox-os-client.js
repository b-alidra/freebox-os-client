'use strict';

/**
 * Load the endpoint declarations
 */
var endpoints = [].concat(
    require('./endpoints/authentication'),
    require('./endpoints/config'),
    require('./endpoints/download'),
    require('./endpoints/connection')
);

/**
 * The client
 */
var client = {};


/**
 * Create the standard callback method of the API
 *
 *
 * @param  {Function} next        The function call with the response as parameter
 *
 * @return {Function}             The callback function
 */
function createCallback(next) {

    /**
     * Try to parse the body from JSON to Object
     *
     *
     * @param  {String} body The body to parse
     *
     * @return {Object}      The object parsed or the body
     */
    function parse(body) {
        try {
            body = JSON.parse(body);
        } catch (e) {}
        return body;
    }

    /**
     * If the next function is undefined, it defines the standard function
     */
    if (!next) {
        next = function(response) {
            console.log(JSON.stringify(response));
        };
    }


    /**
     * Return the callback function
     */
    return function(error, response, body) {
        if (!response) {
            response = {
                statusCode: 999
            };
            error = 'Freebox unreachable';
        }
        if (!error && response.status === 200) {
            body = parse(body);
            next(body);
        } else {
            next({
                success: false,
                msg: error || response.statusText,
                error_code: response.status
            });
        }
    };
}

/**
 * Make an HTTP request
 *
 *
 * @param {Object}		options		The request options
 * @param {Function}	next		The callback function
 *
 * @return {Boolean}				True on success, false otherwise
 */
function request(options, next) {

	if (!Ti.Network.online) {
		next && (next("No connection"));
		return false;
	}
	
	var xhr = Titanium.Network.createHTTPClient({
		onload: function() {
			next && next(null, this, this.responseText);
		},
		onerror: function(e) {
			next && (next(this.statusText, this, this.responseText));
		},
		timeout: options.timeout || 5000
	});
	
	if (OS_IOS)
		xhr.open(options.method, options.url);

	if (!_.isEmpty(options.headers)) {
		for (var i in options.headers) {
			xhr.setRequestHeader(i, options.headers[i]);
		}
	}
	
	if (!OS_IOS)
		xhr.open(options.method, options.url);
		
	if (options.method == 'POST' || options.method == 'PUT') {
		var data = options.json || options.formData || {};
		xhr.send(JSON.stringify(data));
	}
	else
		xhr.send();
	
	return true;
};

/**
 *  Create a function for the endpoint parameter
 *
 *
 * @param  {Object}     endpoint    The description of the endpoint
 * @return {Function}               The action to do for this endpoint
 */
function createEndPoint(endpoint) {
    return function(routeParams, bodyParam, sessionToken, next) {

        /**
         * Define the options
         */
        var options;
        options = {
          url: client.baseUrl + endpoint.options.url,
          encode: 'utf-8',
          method: endpoint.options.method
        };

        if(bodyParam && bodyParam.form){
            options.formData = bodyParam.formData;
            options.headers = {
              'X-Fbx-App-Auth': sessionToken,
              'Content-type':'multipart/form-data'
            };
        }else{
            options.json = bodyParam;
            options.headers = {
              'X-Fbx-App-Auth': sessionToken
            };
        }
        

        /**
         * Replace the route parameters
         */
        for (var i in routeParams) {
            options.url = options.url.replace(':' + i, routeParams[i]);
        }

        /**
         *  Call the API
         */
        request(options, createCallback(next));
    };
}


/**
 * Adds the endpoints to the client
 */
function buildClient() {
    for (var i in endpoints) {
        var endpoint = endpoints[i];
        client[endpoint.name] = createEndPoint(endpoint);
    }
}


/**
 *  The Freebox OS Client
 *
 *
 * @param   freebox     The freebox information
 *
 * @return              The client
 */
function createClient(freebox) {
    client.baseUrl = 'http://' + (freebox.url || 'mafreebox.freebox.fr') + ':' + (freebox.port || '80') + '/api/v3';

    buildClient();

    return client;
}

module.exports = createClient;
