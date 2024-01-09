var BCLS = (function(window, document) {
  var fragment = document.createDocumentFragment(),
    // account stuff
    account_id,
    client_id,
    client_secret,
    // api stuff
    proxyURL = 'https://solutions.brightcove.com/bcls/bcls-proxy/bcls-proxy-v2.php',
    baseURL = 'https://cms.api.brightcove.com/v1/accounts/',
    sort,
    sortDirection = "",
    search,
    limit = 25,
    totalVideos = 0,
    totalCalls = 0,
    callNumber = 0,
    videosArray = [],
    noDownloadableSources = [],
    // elements
    account_id_input = document.getElementById('account_id'),
    client_id_input = document.getElementById('client_id'),
    client_secret_input = document.getElementById('client_secret'),
    numberSelect = document.getElementById('numberSelect'),
    searchStr = document.getElementById('searchStr'),
    sortSelect = document.getElementById('sortSelect'),
    directionSelect = document.getElementById('directionSelect'),
    makeLinks = document.getElementById('makeLinks'),
    logger = document.getElementById('logger'),
    apiRequest = document.getElementById('apiRequest'),
    linksDisplay = document.getElementById('linksDisplay'),
    allButtons = document.getElementsByName('button'),
    noDownloadbody = document.getElementById('noDownloadbody');

  /**
   * tests for all the ways a variable might be undefined or not have a value
   * @param {String|Number} x the variable to test
   * @return {Boolean} true if variable is defined and has a value
   */
  function isDefined(x) {
    if (x === "" || x === null || x === undefined || x === NaN) {
      return false;
    }
    return true;
  }

  /**
   * get selected value for single select element
   * @param {htmlElement} e the select element
   */
  function getSelectedValue(e) {
    return e.options[e.selectedIndex].value;
  }


  /**
   * disables all buttons so user can't submit new request until current one finishes
   */
  function disableButtons() {
    var i,
      iMax = allButtons.length;
    for (i = 0; i < iMax; i++) {
      allButtons[i].setAttribute('disabled', 'disabled');
      allButtons[i].setAttribute('style', 'cursor:not-allowed;');
    }
  }

  /**
   * re-enables all buttons
   */
  function enableButtons() {
    var i,
      iMax = allButtons.length;
    for (i = 0; i < iMax; i++) {
      allButtons[i].removeAttribute('disabled');
      allButtons[i].setAttribute('style', 'cursor:pointer;');
    }
  }

  /**
   * sort an array of objects based on an object property
   * @param {array} targetArray - array to be sorted
   * @param {string|number} objProperty - object property to sort on
   * @return sorted array
   */
  function sortArray(targetArray, objProperty) {
    targetArray.sort(function(b, a) {
      var propA = a[objProperty],
        propB = b[objProperty];
      // sort ascending; reverse propA and propB to sort descending
      if (propA < propB) {
        return -1;
      } else if (propA > propB) {
        return 1;
      } else {
        return 0;
      }
    });
    return targetArray;
  }

  function processSources(sources) {
    var i = sources.length;
    // console.log('sources before: ', sources);
    // remove non-MP4 sources
    while (i > 0) {
      i--;
      var s = sources[i];
      if ('src' in s) {
          if (s.container !== 'MP4' && s.container !== 'FLV') {
            sources.splice(i, 1);
          }
        } else if ('stream_name' in s) {
          sources.splice(i, 1);
        } else if ('app_name' in s) {
          sources.splice(i, 1);
        } else if (s.hasOwnProperty('src')) {
          if (s.src.indexOf('master.m3u8') > -1 || s.src.indexOf('manifest.mpd') > -1) {
            sources.splice(i, 1);
          }
        } else {
          sources.splice(i, 1);
        }
      }
    // sort sources by encoding rate
    // console.log('sources after: ', sources);
    sortArray(sources, 'encoding_rate');
    // return the first item (highest bitrate)
    // console.log('sources sorted', sources);
    if (sources.length > 0) {
      // console.log('processed source', sources[0]);
      return sources[0];
    } else {
      return null;
    }
  }

  function addItems() {
    var i,
      iMax,
      video,
      pubdate,
      videoURL,
      linkTable = document.createElement('table'),
      linkHead = document.createElement('thead'),
      linkBody = document.createElement('tbody'),
      linkTh,
      linkTd,
      linkTr,
      content,
      linkA;
    linkTable.setAttribute('class', 'bcls-table');
    linkHead.setAttribute('class', 'bcls-table__head');
    linkBody.setAttribute('class', 'bcls-table__body');
    fragment.appendChild(linkTable);
    linkTable.appendChild(linkHead);
    linkTable.appendChild(linkBody);
    // create the header row
    linkTr = document.createElement('tr');
    linkTh = document.createElement('th');
    content = document.createTextNode('Video id');
    linkTh.appendChild(content);
    linkTr.appendChild(linkTh);
    linkTh = document.createElement('th');
    content = document.createTextNode('Name');
    linkTh.appendChild(content);
    linkTr.appendChild(linkTh);
    linkTh = document.createElement('th');
    content = document.createTextNode('Date Created');
    linkTh.appendChild(content);
    linkTr.appendChild(linkTh);
    linkTh = document.createElement('th');
    content = document.createTextNode('Download Link');
    linkTh.appendChild(content);
    linkTr.appendChild(linkTh);
    linkHead.appendChild(linkTr);
    // add the body rows
    if (videosArray.length > 0) {
      iMax = videosArray.length;
      for (i = 0; i < iMax; i += 1) {
        video = videosArray[i];
        // video may not have a valid source
        if (isDefined(video.source)) {
          if (isDefined(video.source.src)) {
            videoURL = video.source.src;
          } else if (isDefined(video.source.streaming_src)) {
          videoURL = video.source.streaming_src;
          }
        } else {
          videoURL = null;
        }
        linkTr = document.createElement('tr');
        linkTd = document.createElement('td');
        content = document.createTextNode(video.id);
        linkTd.appendChild(content);
        linkTr.appendChild(linkTd);
        linkTd = document.createElement('td');
        content = document.createTextNode(video.name);
        linkTd.appendChild(content);
        linkTr.appendChild(linkTd);
        linkTd = document.createElement('td');
        content = document.createTextNode(video.created_at);
        linkTd.appendChild(content);
        linkTr.appendChild(linkTd);
        linkTd = document.createElement('td');
        if (isDefined(videoURL)) {
          linkA = document.createElement('a');
          linkA.setAttribute('href', videoURL);
          linkA.setAttribute('target', '_blank');
          content = document.createTextNode(videoURL);
          linkA.appendChild(content);
          linkTd.appendChild(linkA);
        } else {
          content = document.createTextNode('No downloadable rendition');
          linkTd.appendChild(content);
        }
        linkTr.appendChild(linkTd);
        linkBody.appendChild(linkTr);
      }
    }
    logger.textContent = 'Finished!';
    linksDisplay.appendChild(fragment);
    enableButtons();
    // if (noDownloadableSources.length > 0) {
    //   listVideosWithNoDownload();
    // }
  }

  function listVideosWithNoDownload() {
    var tr,
      td,
      frag = document.createDocumentFragment(),
      i = 0,
      iMax;
    iMax = noDownloadableSources.length;
    for (i; i < iMax; i++) {
      tr = document.createElement('tr');
      td = document.createElement('td');
      td.textContent = noDownloadableSources[i].id;
      tr.appendChild(td);
      td = document.createElement('td');
      td.textContent = noDownloadableSources[i].name;
      tr.appendChild(td);
      frag.appendChild(tr);
    }
    noDownloadbody.appendChild(frag);
  }

  /**
   * sets up the data for the API request
   * @param {String} id the id of the button that was clicked
   */
  function createRequest(id) {
    var endPoint = '',
      options = {},
      parsedData;
    // disable buttons to prevent a new request before current one finishes
    disableButtons();

    // set up common options
    options.proxyURL = proxyURL;
    options.account_id = account_id;
    if (isDefined(client_id) && isDefined(client_secret)) {
      options.client_id = client_id;
      options.client_secret = client_secret;
    }
    switch (id) {
      case 'getCount':
        endPoint = account_id + '/counts/videos?sort=' + sort;
        if (isDefined(search)) {
          endPoint += '&q=' + search;
        }
        options.url = baseURL + endPoint;
        options.requestType = 'GET';
        apiRequest.textContent = options.url;
        makeRequest(options, function(response) {
          parsedData = JSON.parse(response);
          // set total videos
          totalVideos = parsedData.count;
          totalCalls = Math.ceil(totalVideos / limit);
          logger.textContent = 'Total videos: ' + totalVideos;
          createRequest('getVideos');
        });
        break;
      case 'getVideos':
        endPoint = account_id + '/videos?sort=' + sort + '&limit=' + limit + '&offset=' + limit * callNumber;
        if (isDefined(search)) {
          endPoint += '&q=' + search;
        }
        options.url = baseURL + endPoint;
        options.requestType = 'GET';
        apiRequest.textContent = options.url;
        makeRequest(options, function(response) {
          parsedData = JSON.parse(response);
          videosArray = videosArray.concat(parsedData);
          callNumber++;
          if (callNumber < totalCalls) {
            logger.textContent = 'Getting video set ' + callNumber;
            createRequest('getVideos');
          } else {
            logger.textContent = 'Video data for ' + totalVideos + ' retrieved; getting sources...';
            callNumber = 0;
            createRequest('getVideoSources');
          }
        });
        break;
      case 'getVideoSources':
        var sources,
          i,
          iMax = videosArray.length;
        endPoint = account_id + '/videos/' + videosArray[callNumber].id + '/sources';
        options.url = baseURL + endPoint;
        options.requestType = 'GET';
        apiRequest.textContent = options.url;
        logger.textContent = 'Getting sources for video ' + videosArray[callNumber].name;
        makeRequest(options, function(response) {
          sources = JSON.parse(response);
          if (sources.length > 0) {
            // get the best MP4 rendition
            var source = processSources(sources);
            // console.log('source', source);
            videosArray[callNumber].source = source;
            // if (source === null) {
            //   noDownloadableSources.push(videosArray[callNumber])
            // }
          } else {
            // video has no sources
            videosArray[callNumber].source = null;
            noDownloadableSources.push(videosArray[callNumber])
          }
          callNumber++;
          if (callNumber < iMax) {
            createRequest('getVideoSources');
          } else {
            // remove videos with no sources
            i = videosArray.length;
            while (i > 0) {
              i--;
              // console.log('videosArray[i]', videosArray[i]);
              if (!isDefined(videosArray[i].source)) {
                videosArray.splice(i, 1);
              }
            }
            addItems();
          }
        });
        break;
    }
  }

  /**
   * send API request to the proxy
   * @param  {Object} options for the request
   * @param  {String} options.url the full API request URL
   * @param  {String="GET","POST","PATCH","PUT","DELETE"} requestData [options.requestType="GET"] HTTP type for the request
   * @param  {String} options.proxyURL proxyURL to send the request to
   * @param  {String} options.client_id client id for the account (default is in the proxy)
   * @param  {String} options.client_secret client secret for the account (default is in the proxy)
   * @param  {JSON} [options.requestBody] Data to be sent in the request body in the form of a JSON string
   * @param  {Function} [callback] callback function that will process the response
   */
  function makeRequest(options, callback) {
    var httpRequest = new XMLHttpRequest(),
      response,
      requestParams,
      dataString,
      proxyURL = options.proxyURL,
      // response handler
      getResponse = function() {
        try {
          if (httpRequest.readyState === 4) {
            if (httpRequest.status >= 200 && httpRequest.status < 300) {
              response = httpRequest.responseText;
              // some API requests return '{null}' for empty responses - breaks JSON.parse
              if (response === '{null}') {
                response = null;
              }
              // return the response
              callback(response);
            } else {
              alert('There was a problem with the request. Request returned ' + httpRequest.status);
            }
          }
        } catch (e) {
          alert('Caught Exception: ' + e);
        }
      };
    /**
     * set up request data
     * the proxy used here takes the following request body:
     * JSON.stringify(options)
     */
    // set response handler
    httpRequest.onreadystatechange = getResponse;
    // open the request
    httpRequest.open('POST', proxyURL);
    // set headers if there is a set header line, remove it
    // open and send request
    httpRequest.send(JSON.stringify(options));
  }

  function init() {
    // event handlers
    makeLinks.addEventListener('click', function() {
      var numVideos;
      // get the inputs
      client_id = client_id_input.value;
      client_secret = client_secret_input.value;
      // only use entered account id if client id and secret are entered also
      if (isDefined(client_id) && isDefined(client_secret)) {
        if (isDefined(account_id_input.value)) {
          account_id = account_id_input.value;
        } else {
          window.alert('To use your own account, you must specify an account id, and client id, and a client secret - since at least one of these is missing, a sample account will be used');
          account_id = '1752604059001';
        }
      } else {
        account_id = '1752604059001';
      }
      sort = getSelectedValue(sortSelect);
      sortDirection = getSelectedValue(directionSelect);
      if (isDefined(sortDirection)) {
        sort = sortDirection + sort;
      }
      search = searchStr.value;
      numVideos = getSelectedValue(numberSelect);
      // add title and description
      // if all videos wanted, get count; otherwise get videos
      if (numVideos === 'all') {
        // we need to get the count
        createRequest('getCount');
      } else {
        totalVideos = parseInt(numVideos);
        totalCalls = Math.ceil(numVideos / limit);
        logger.textContent = 'Total videos to retrieve: ' + totalVideos;
        createRequest('getVideos');
      }
    });
    linksDisplay.addEventListener('click', function() {
      linksDisplay.select();
    });
  }

  init();
})(window, document);