(function (window, document, undefined) {
    "use strict";
    
    var Pixel = function (options) {
        if (!this.init) {
            return new Pixel(options);
        }
        return this.init(merge(options || {}, defaults));
    };

    var defaults = {
        element:        undefined,
        x:              undefined,
        y:              undefined,
        red:            undefined,
        green:          undefined,
        blue:           undefined,
        alpha:          undefined,
        luma:           undefined,
        u:              undefined,
        v:              undefined,
        cacheImageData: true,
        cache:          []
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
        this.element =        options.element;
        this.x       =        options.x;
        this.y       =        options.y;
        this.red     =        options.red;
        this.green   =        options.green;
        this.blue    =        options.blue;
        this.alpha   =        options.alpha;
        this.luma    =        options.luma;
        this.u       =        options.u;
        this.v       =        options.v;
        this.cacheImageData = options.cacheImageData;
        this.cache   =        options.cache;
        return this;
    };

    Object.prototype.isElement = function () {
        return (
            typeof HTMLElement === "object" ? this instanceof HTMLElement :
            typeof this === "object" && this.nodeType === 1 && typeof this.nodeName === "string"
        );
    };

    HTMLElement.prototype.getPixel = function (x, y) {
        return new Pixel({ element: this, x: x, y: y }).readData();
    };

    HTMLCanvasElement.prototype.putPixel = function (p) {
        p.element = this;
        return p.writeData();
    };

    Pixel.prototype.next = function () {
        if (this.x == this.element.width - 1 && this.y == this.element.height - 1) {
            return false;
        }
        if (this.x == this.element.width - 1) {
            this.y++;
            this.x = -1;
        }
        this.x++;
        return this.readData();
    };

    Pixel.prototype.above = function () {
        return (this.y-- == 0 ? false : this.readData());
    };

    Pixel.prototype.below = function () {
        return (this.y++ == this.element.height - 1 ? false : this.readData());
    };

    Pixel.prototype.left = function () {
        return (this.x-- == 0 ? false : this.readData());
    };

    Pixel.prototype.right = function () {
        return (this.x++ == this.element.width - 1 ? false : this.readData());
    };

    Pixel.prototype.readData = function () {
        if (this.element === undefined || !this.element.isElement()) {
            throw new TypeError("Invalid source element.");
        }
        if (this.x === undefined || isNaN(this.x)) {
            throw new TypeError("X coordinate should be a number.");
        }
        if (this.y === undefined || isNaN(this.y)) {
            throw new TypeError("Y coordinate should be a number.");
        }
        if (this.x >= this.element.width || this.x < 0) {
            throw new RangeError("X coordinate " + this.x + " is outside source (" + this.element.width + "px)");
        } else if (this.y >= this.element.height || this.y < 0) {
            throw new RangeError("Y coordinate " + this.y + " is outside source (" + this.element.height + "px)");
        }
        var data = this.cache;
        var position = this.y * this.element.width * 4 + this.x * 4;
        if (!this.cacheImageData || !data.length) {
            var canvas   = document.createElement('canvas');
            var context  = canvas.getContext('2d');
            if (this.cacheImageData) {
                canvas.width = this.element.width;
                canvas.height = this.element.height;
                context.drawImage(this.element, 0, 0);
                data = this.cache = context.getImageData(0, 0, this.element.width, this.element.height).data;
            } else {
                canvas.width = canvas.height = 1;
                context.drawImage(this.element, this.x, this.y, 1, 1);
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

    Pixel.prototype.writeData = function () {
        if (this.element === undefined || !this.element.isElement() || !(this.element instanceof HTMLCanvasElement)) {
            throw new TypeError("Invalid destination element.");
        }
        if (this.x === undefined || isNaN(this.x)) {
            throw new TypeError("X coordinate should be a number.");
        }
        if (this.y === undefined || isNaN(this.y)) {
            throw new TypeError("Y coordinate should be a number.");
        }
        if (this.x >= this.element.width || this.x < 0) {
            throw new RangeError("X coordinate " + this.x + " is outside destination (" + this.element.width + "px)");
        } else if (this.y >= this.element.height || this.y < 0) {
            throw new RangeError("Y coordinate " + this.y + " is outside destination (" + this.element.height + "px)");
        }
        
        var context = this.element.getContext('2d');
        var data = context.createImageData(1, 1);
        data.data[0] = this.red;
        data.data[1] = this.green;
        data.data[2] = this.blue;
        data.data[3] = this.alpha;
        context.putImageData(data, this.x, this.y);
        return this;
    };

    Pixel.prototype.YUV = function () {
        if (this.red === undefined || this.green === undefined || this.blue === undefined) {
            throw new Error("No RGB color data to convert to YUV.");
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
        return "#" + pad(this.red.toString(16)) + pad(this.green.toString(16)) + pad(this.blue.toString(16));
    };

    function truncate (number) {
        return (String(number).length == 2 ? number[0] : number);
    }

    Pixel.prototype.shortHex = function () {
        return "#" + truncate(this.red.toString(16)) + truncate(this.green.toString(16)) + truncate(this.blue.toString(16));
    };

    window.Pixel = Pixel;
})(window, document);
