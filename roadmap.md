
TODO: conver to this to sprints

1) instantiate manager instances
    { configs, plugins, https, services }
2) run managers "init"
     1) config manager - load configs
     2) plugin manager - load plugins
     3) http manager - init http server (don't start)
     4) service manager - init services
3) run manager "postInit"
     4) service manager - postInit services
4) start http server
     3) http framework - start
5)


all route defaults
    [ ] authRequired
    [ ] pipeline order
    [ ] ...

service/pipeline middleware management
    push to end
    push to top
    insert after X

ES6 base classes for:
    [ ] services
    [ ] controllers
    [ ] models
    [ ] service/pipeline middleware
    [ ] hyper middleware
        [ ] templates engines (ejs, handlebars)
        [ ] plugin manager (yanpm)

hyper.use(...) // add hyper middleware
    // default:
    //   service manager
    //   plugin manager
    //   config manager
    //   http framework
    //   micro service communication bus (default: direct http)
hyper.services.use(...) // add hyper service engine middleware

make services engine a middleware for hyper

restructure of route config?
{
    authRequired: true,
    api: {
        route: "/api/photos",
        controller: "photos",
        method: {
            get: "index"
        }
    }
}

route shortcuts?
     [ ] handler -> method: { get: ... }