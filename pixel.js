(function (window, document, undefined) {
    "use strict";
    
    var Pixel = function (options) {
        if (!this.init) {
            return new Pixel(options);
        }
        return this.init(merge(options || {}, defaults));
    };

    var defaults = {
        source:          undefined,
        x:               undefined,
        y:               undefined,
        red:             undefined,
        green:           undefined,
        blue:            undefined,
        alpha:           undefined,
        luma:            undefined,
        u:               undefined,
        v:               undefined,
        cacheSourceData: true,
        cache:           []
    };

    function merge (obj) {
        for (var i = 1; i < arguments.length; i++) {
            var def = arguments[i];
            for (var key in def) {
                if (obj[key] === undefined) obj[key] = def[key];
            }
        }
        return obj;
    }
    
    Pixel.prototype.init = function (options) {
        if (options === undefined) {
            options = {};
        }
        this.source =          options.source;
        this.x      =          options.x;
        this.y      =          options.y;
        this.red    =          options.red;
        this.green  =          options.green;
        this.blue   =          options.blue;
        this.alpha  =          options.alpha;
        this.luma   =          options.luma;
        this.u      =          options.u;
        this.v      =          options.v;
        this.cacheSourceData = options.cacheSourceData;
        this.cache  =          options.cache;
        return this;
    };

    Object.prototype.isElement = function () {
        return (
            typeof HTMLElement === "object" ? this instanceof HTMLElement :
            typeof this === "object" && this.nodeType === 1 && typeof this.nodeName === "string"
        );
    };

    HTMLElement.prototype.getPixel = function (x, y) {
        var self = this;
        return new Pixel({ source: self, x: x, y: y }).readData();
    };

    Pixel.prototype.next = function () {
        if (this.x == this.source.width - 1 && this.y == this.source.height - 1) {
            return false;
        }
        if (this.x == this.source.width - 1) {
            this.y++;
            this.x = 0;
            return this.readData();
        }
        this.x++;
        return this.readData();
    };

    Pixel.prototype.above = function () {
        if (this.y == 0) {
            return false;
        }
        this.y--;
        return this.readData();
    };

    Pixel.prototype.below = function () {
        if (this.y == this.source.height - 1) {
            return false;
        }
        this.y++;
        return this.readData();
    };

    Pixel.prototype.left = function () {
        if (this.x == 0) {
            return false;
        }
        this.x--;
        return this.readData();
    };

    Pixel.prototype.right = function () {
        if (this.x == this.source.width - 1) {
            return false;
        }
        this.x++;
        return this.readData();
    };

    Pixel.prototype.readData = function () {
        if (this.source === undefined || !this.source.isElement()) {
            throw new TypeError("Invalid source element.");
            return false;
        }
        if (this.x === undefined || isNaN(this.x)) {
            throw new TypeError("X coordinate should be a number.");
            return false;
        }
        if (this.y === undefined || isNaN(this.y)) {
            throw new TypeError("Y coordinate should be a number.");
            return false;
        }
        if (this.x >= this.source.width || this.x < 0) {
            throw new RangeError("X coordinate " + this.x + " is outside source (" + this.source.width + "px)");
            return false;
        } else if (this.y >= this.source.height || this.y < 0) {
            throw new RangeError("Y coordinate " + this.y + " is outside source (" + this.source.height + "px)");
            return false;
        }
        var data = this.cache;
        var position = this.y * this.source.width * 4 + this.x * 4;
        if (!this.cacheSourceData || (this.cacheSourceData && this.cache.length === 0)) {
            var canvas   = document.createElement('canvas');
            var context  = canvas.getContext('2d');
            if (this.cacheSourceData) {
                canvas.width = this.source.width;
                canvas.height = this.source.height;
                context.drawImage(this.source, 0, 0);
                data = this.cache = context.getImageData(0, 0, this.source.width, this.source.height).data;
            } else {
                canvas.width = canvas.height = 1;
                context.drawImage(this.source, this.x, this.y, 1, 1);
                data = context.getImageData(0, 0, 1, 1).data;
                position = 0;
            }
        }
        this.red   = data[position];
        this.green = data[position + 1];
        this.blue  = data[position + 2];
        this.alpha = data[position + 3];
        return this;
    };

    Pixel.prototype.YUV = function () {
        if (this.red === undefined || this.green === undefined || this.blue === undefined) {
            throw new Error("No RGB color data to convert to YUV.");
            return false;
        }
        this.luma = Math.round(this.red * 0.299 + this.green * 0.587 + this.blue * 0.114);
        this.u = Math.round(this.red * -0.168736 + this.green * -0.331264 + this.blue * 0.5 + 128);
        this.v = Math.round(this.red * 0.5 + this.green * -0.418688 + this.blue * -0.081312 + 128);
        return this;
    };

    function constrain (value) {
        if (value < 0) return 0;
        if (value > 255) return 255;
        return Math.round(value);
    }

    Pixel.prototype.RGB = function () {
        if (this.luma === undefined || this.u === undefined || this.v === undefined) {
            throw new Error("No YUV color data to convert to RGB.");
            return false;
        }
        var vd = this.v - 128;
        var ud = this.u - 128;

        this.red = constrain(this.luma + 1.4075 * vd);
        this.green = constrain(this.luma - 0.3455 * ud - (0.7169 * vd));
        this.blue = constrain(this.luma + 1.7790 * ud);
        return this;
    };

    Pixel.prototype.euclideanDistance = function (pixel) {
        this.YUV();
        pixel.YUV();
        return Math.sqrt(Math.pow((this.u - pixel.u), 2) + Math.pow((this.v - pixel.v), 2));
    };

    function pad (number) {
        return (String(number).length == 1 ? "0" : "") + number;
    }

    Pixel.prototype.hex = function () {
        var hex = "#" + pad(this.red.toString(16)) + pad(this.green.toString(16)) + pad(this.blue.toString(16));
        if (this.alpha !== undefined) {
            hex += pad(this.alpha.toString(16));
        }
        return hex;
    };

    function truncate (number) {
        return (String(number).length == 2 ? number[0] : number);
    }

    Pixel.prototype.shortHex = function () {
        var hex = "#" + truncate(this.red.toString(16)) + truncate(this.green.toString(16)) + truncate(this.blue.toString(16));
        if (this.alpha !== undefined) {
            hex += truncate(this.alpha.toString(16));
        }
        return hex;
    };

    window.Pixel = Pixel;
})(window, document);
