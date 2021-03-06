//namespace
if (!this.hook)
    this.hook = {};


(function () {
    function C3Interface(chart) {
        adapter.Interface.call(this);
        this.chart = chart;
    }

    C3Interface.prototype = new adapter.Interface();
    C3Interface.prototype.constructor = C3Interface;

    var p = C3Interface.prototype;
    /*
     *This function renders on the visualization library , which are hooked to it
     * @param keys: We need to give the index value or Keys associated with that record [0,3,5]
     * @param columns: We need to give the the charts column ids like ['col1','col2']
     * @param chart: we need to give chart instance generated in c3
     */
    p.doSelection = function (keys) {

        if (keys !== undefined) {
            if (keys.constructor !== Array) console.log("Keys has to be an array ");
        } else console.log("keys(Array)  is required");

        if (keys.length > 0) {
            var numericKeys = keys.map(function (key) {
                if (key.constructor === String)
                    return key = Number(key);
                else
                    return key;
            });
            this.chart.select(this.chart.columns, numericKeys, true);
        } else
            this.chart.unselect();
    }

    hook.C3Interface = C3Interface;

}());
