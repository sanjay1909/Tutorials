var Parent = React.createClass({displayName: "Parent",
    getInitialState: function(){
         return {
           items: []
         }
    },

    jsonRequest: function (jsonURL,callback) {

        var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
        xobj.open('GET', jsonURL, true); //
        xobj.onreadystatechange = function () {
            if (xobj.readyState == 4 && xobj.status == "200") {
                callback(xobj.responseText);
            }
        };
        xobj.send(null);
    },
    loadJSON: function (jsonURL) {
        this.jsonRequest(jsonURL,function (response) {
            var actual_JSON = JSON.parse(response);
            this.setState({items: actual_JSON.items})
        }.bind(this));
    },

    componentDidMount: function() {
    //this.loadJSON('sustainability.json');
    },
    render: function () {
        return ( React.createElement("div", null,
                    React.createElement(Instruction, {heading: "Heading", content: "Hi I am Instructions"}),
                    React.createElement(Snippet, {language: "javascript", content: "hi I am code"})
                 )
        );
    }
});
