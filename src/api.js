var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function Viz(src) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  
  options = _extends({ format: "svg", engine: "dot", files: [], images: [] }, options);
  
  for (var i = 0; i < options.images.length; i++) {
    options.files.push({ path: options.images[i].path, data: "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg width=\"" + options.images[i].width + "\" height=\"" + options.images[i].height + "\"></svg>" });
  }

  if (options.format == "png-image-element") {
    var result = render(src, _extends({}, options, { format: "svg" }));
    return Viz.svgXmlToPngImageElement(result, options.scale);
  } else {
    return render(src, options);
  }
}

function render(src, options) {
  var graphviz = Module({ TOTAL_MEMORY: options.totalMemory });
  
  for (var i = 0; i < options.files.length; i++) {
    graphviz["ccall"]("vizCreateFile", "number", ["string", "string"], [options.files[i].path, options.files[i].data]);
  }
  
  if (options.yInvert) {
    graphviz["ccall"]("vizSetY_invert", "number", ["number"], [1]);
  }
  
  var resultPointer = graphviz["ccall"]("vizRenderFromString", "number", ["string", "string", "string"], [src, options.format, options.engine]);
  var resultString = graphviz["Pointer_stringify"](resultPointer);

  var errorMessagePointer = graphviz["ccall"]("vizLastErrorMessage", "number", [], []);
  var errorMessageString = graphviz["Pointer_stringify"](errorMessagePointer);
  
  if (errorMessageString != "") {
    throw new Error(errorMessageString);
  }
  
  return resultString;
}

// https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding
function b64EncodeUnicode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
    return String.fromCharCode('0x' + p1);
  }));
}

Viz.svgXmlToPngImageElement = function(svgXml, scale, callback) {
  if (scale === undefined) {
    if ("devicePixelRatio" in window && window.devicePixelRatio > 1) {
      scale = window.devicePixelRatio;
    } else {
      scale = 1;
    }
  }
  
  var pngImage = new Image();

  try {
    if (typeof fabric === "object" && fabric.loadSVGFromString) {
      fabric.loadSVGFromString(svgXml, function(objects, options) {
        // If there's something wrong with the SVG, Fabric may return an empty array of objects. Graphviz appears to give us at least one <g> element back even given an empty graph, so we will assume an error in this case.
        if (objects.length == 0) {
          if (callback !== undefined) {
            callback(new Error("Error loading SVG with Fabric"));
            return;
          } else {
            throw new Error("Error loading SVG with Fabric");
          }
        }
      
        var element = document.createElement("canvas");
        element.width = options.width;
        element.height = options.height;
    
        var canvas = new fabric.Canvas(element, { enableRetinaScaling: false });
        var obj = fabric.util.groupSVGElements(objects, options);
        canvas.add(obj).renderAll();
    
        pngImage.src = canvas.toDataURL({ multiplier: scale });
        pngImage.width = options.width;
        pngImage.height = options.height;
      
        if (callback !== undefined) {
          callback(null, pngImage);
        }
      });
    } else {
      var svgImage = new Image();

      svgImage.onload = function() {
        var canvas = document.createElement("canvas");
        canvas.width = svgImage.width * scale;
        canvas.height = svgImage.height * scale;

        var context = canvas.getContext("2d");
        context.drawImage(svgImage, 0, 0, canvas.width, canvas.height);

        pngImage.src = canvas.toDataURL("image/png");
        pngImage.width = svgImage.width;
        pngImage.height = svgImage.height;
      
        if (callback !== undefined) {
          callback(null, pngImage);
        }
      }
    
      svgImage.onerror = function(e) {
        var error;
      
        if ('error' in e) {
          error = e.error;
        } else {
          error = new Error('Error loading SVG');
        }
      
        if (callback !== undefined) {
          callback(error);
        } else {
          throw error;
        }
      }
    
      svgImage.src = "data:image/svg+xml;base64," + b64EncodeUnicode(svgXml);
    }
  } catch (e) {
    if (callback !== undefined) {
      callback(e);
    } else {
      throw e;
    }
  }
  
  if (callback === undefined) {
    return pngImage;
  }
}

Viz.svgXmlToPngBase64 = function(svgXml, scale, callback) {
  Viz.svgXmlToPngImageElement(svgXml, scale, function(err, image) {
    if (err) {
      callback(err);
    } else {
      callback(null, image.src.slice("data:image/png;base64,".length));
    }
  });
}
