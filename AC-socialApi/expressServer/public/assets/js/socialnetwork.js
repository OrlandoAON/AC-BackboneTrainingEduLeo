var UserModel = Backbone.Model.extend({
	urlRoot : "/users/me",
	idAttribute: '_id',
	initialize: function() {
		// this.fetch();
		this.on("sync", function(){
			console.log("attributes",this.attributes);
		});
	},
	parse: function(resp, options){
		var fullName = resp.name.split(' ');
		resp.firstname = fullName[0];
		resp.lastname = fullName[1];
		return resp;
	},
	validate: function(attrs, options) {
        if ( attrs.name === '' ) {
            return "The name cannot be empty.";
        }
        if ( attrs.email === '') {
        	return "The email cannot be empty.";
        }
    },
	toJSON: function(){
        var clone = _.clone(this.attributes);
        // clone.name = clone.firstname + ' ' + clone.lastname;
        delete clone.firstName;
        delete clone.lastName;
        return clone
    },
    sync: function(method, model, options) {  
	    options || (options = {});
	    switch (method) {
	        
	        case 'update':
	        	options.url = this.urlRoot;
	        break;
	        
	    }
	    return Backbone.sync(method, model, options);
	}

});

var AvailableUsersList = Backbone.Collection.extend({
    url: '/users/available',
    model: UserModel
});

var FriendsRequestsList = Backbone.Collection.extend({
  url: '/friendships/requests'
});

var FriendsRequestedList = Backbone.Collection.extend({
  url: '/friendships/requested'
});

var FriendsList = Backbone.Collection.extend({
  url: '/friendships/me'
});

var ProfileView = Backbone.View.extend( { 
		
	template: _.template($("#profileTemplate").html()),
	render: function() {
		console.log("render", this.model.attributes);
		this.$el.html(this.template(this.model.attributes));
		this.loadChildrenViews();
		return this;
	},
	initialize: function(model) {
		console.log("model in",this.model);
		this.listenTo(this.model, "sync", this.render);
		this.model.fetch();
		this.loadCollections();
	},
	loadCollections: function (){
		var users = new AvailableUsersList();
		this.listenTo(users, "update", this.log);
		users.fetch({label:'Available Users Collection'});

		var users2 = new FriendsRequestsList();
		this.listenTo(users2, "update", this.log);
		users2.fetch({label:'Available Users Collection2'});

		var users3 = new FriendsRequestedList();
		this.listenTo(users3, "update", this.log);
		users3.fetch({label:'Available Users Collection3'});

		var users4 = new FriendsList();
		this.listenTo(users4, "update", this.log);
		users4.fetch({label:'Available Users Collection4'});
	},
	log: function( users, options ){
		console.log("users", users.model);
		console.log("options", options);
	},
	loadChildrenViews: function() {
		var availableUsersView = new AvailableUsersView({el: "#availableUsersContainer", collection:new AvailableUsersList()});
		var friendsRequestsListView = new FriendsRequestsListView({collection:new FriendsRequestsList()});
		var friendsRequestedListView = new FriendsRequestedListView({collection:new FriendsRequestedList()});
		var friendsListView = new FriendsListView({collection:new FriendsList()});
	}
	
});

var EditProfileView = Backbone.View.extend( { 
	events: {
			'submit form' : 'save'
	},
	template: _.template($("#editProfileTemplate").html()),
	render: function() {
			console.log("render", this.model.attributes);
			this.$el.html(this.template(this.model.attributes));
			return this;
	},
	initialize: function(model) {
			console.log("model in",this.model);
			this.listenTo(this.model, "sync", this.render);
			this.model.fetch();
		},
	save: function(event){
		event.preventDefault();
		var $form = $(event.currentTarget);
		this.model.set({
			name: $form.find("#name").val(),
			email:$form.find("#email").val()
		});
		this.model.save();
		router.navigate("", true);
	}
	
});

var Router = Backbone.Router.extend({
	  routes: {
	    "": "viewProfile",
	    "edit": "editProfile",
	    "*splat": "notFound"
	  },
	  initialize: function() {
	  	Backbone.history.start();
	  },
	  viewProfile: function() {
	    var userModel = new UserModel(),
	        profileView = new ProfileView({ model: userModel });    
	    this.setView(profileView);
	  },
	  editProfile: function(userId) {
	    var userModel = new UserModel(),
	        editProfileView = new EditProfileView({ model: userModel });
	    this.setView(editProfileView);
	  },
	  setView : function( view) {
	  	if (this.currentView) {
	  		this.currentView.remove();
	  	}
	  	this.currentView = view;
	  	this.currentView.$el.appendTo("#mainViewContainer");
	  }
});

//------------------exercise10

var CollectionView = Backbone.View.extend({
    initialize: function() {
        this.listenTo(this.collection, "update", this.render);
        this.collection.fetch();
    },
    render: function() {
    	var self = this;
	    this.$el.html(''); // clean before start
	    this.collection.forEach(function(model, index){     
	      self.$el.append( self.template(model.attributes));
	    })
	},
	refresh: function(model, rest, options) {
		this.collection.fetch();
		if (options.trigger) {
			Backbone.trigger(options.trigger);
		}
    },
});

var FriendshipModel = Backbone.Model.extend({
    urlRoot: '/friendships',
    sync: function(method, model, options) {
    	console.log("model", model);
        options || (options = {});
        options.url = this.urlRoot + '/' + model.attributes.friendID;
        return Backbone.sync(method, model, options);
    }
});

var AvailableUsersView = CollectionView.extend({
	events: {
		'click .inviteFriend' : 'inviteFriend'
	},
	el:"#auxiliarContainer",
    template: _.template($('#availableUsersTemplate').html()),
    inviteFriend: function(event) { 
    	var index = $(event.currentTarget).parents('.user-div').index();
    	var id = this.collection.at(index).get('_id');
    	var friendship = new FriendshipModel({friendID: id});
    	this.listenToOnce(friendship, "sync", this.refresh),
    	friendship.save(null, {trigger:'inviteSent'});
    }
});

var FriendsRequestsListView = CollectionView.extend({
	events: {
		'click .acceptFriend' : 'acceptFriend'
	},
	el:'#friendRequestsContainer',
    template: _.template($('#friendRequestTemplate').html()),
    acceptFriend: function() {
    	var index = $(event.currentTarget).parents('.user-div').index();
    	var id = this.collection.at(index).get('userRequester')._id;
    	var friendship = new FriendshipModel({friendID: id, id:1});
    	this.listenToOnce(friendship, "sync", this.refresh),
    	friendship.save(null, {trigger:'friendAccepted'});
    }
});

var FriendsRequestedListView = CollectionView.extend({
	el:'#myRequestsContainer',
    template: _.template($('#friendRequestedTemplate').html()),
    initialize: function() {
    	CollectionView.prototype.initialize.apply(this, arguments);
    	this.listenTo(Backbone, 'inviteSent', this.refresh);
    }
});

var FriendsListView = CollectionView.extend({
	el:'#myFriendsContainer',
    template: _.template($('#friendTemplate').html()),
    initialize: function() {
    	CollectionView.prototype.initialize.apply(this, arguments);
    	this.listenTo(Backbone, 'friendAccepted', this.refresh);
    }
});

var router = new Router();
// var availableUsersView = new AvailableUsersView({collection:new AvailableUsersList()});
// availableUsersView.render();


