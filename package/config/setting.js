const swaggerUi = require('swagger-ui-express')
const fs = require("fs")
const {dirname, join } = require("path");
const _ = require("lodash")

const getRootPath = require("../util/getRootPath")
const getMetadata = require("./getMetadata")
const getRegisteredRoutesTemplete = require("./getRegisteredRoutes");    


const config = (...options)=>{
    let {
        title,
        version, 
        description,
        summary,
        termsOfService,
        license,
        contact,
        app,
        docsPath
    } = options[0]
    
    let docs = docsPath ? docsPath : 'api-docs'
    let autoGenPath =  join(getRootPath(dirname),"autoGens")

    const templete = getMetadata({
        title,
        version, 
        description,
        summary,
        termsOfService,
        license,
        contact
    })
 
   // create all the needed files in autoGens directory
   if(!fs.existsSync(autoGenPath)){
       fs.mkdirSync(autoGenPath, {recursive:true})
       
        fs.writeFileSync( join(autoGenPath, "swaggerDocument.json"), JSON.stringify(templete),
            (err)=>{
                if(err) console.log(err)
            } 
        )
        fs.writeFileSync( join(autoGenPath, "pathSchema.json"),  JSON.stringify({}),
            (err)=>{
                if(err) console.log(err)
            } 
        )
        fs.writeFileSync( join(autoGenPath, "jsonSchema.json"), JSON.stringify({}),
            (err)=>{
                if(err) console.log(err)
            } 
        ) 
        fs.readFile(join(autoGenPath, "swaggerDocument.json"), "utf8", (err, file)=>{
            if(err)console.log(err)
            app.use(`/${docs}`, swaggerUi.serve, swaggerUi.setup(JSON.parse(file)))
        })    
   }

    let jsonSchema =  fs.readFileSync(join(autoGenPath, "jsonSchema.json"))
    jsonSchema = JSON.parse(jsonSchema)

    const [routes, tem] = getRegisteredRoutesTemplete(app)
    let registeredTempelete = tem && JSON.parse(tem)
    
    // update and render the updated JSdocs for any deleted path
    if(registeredTempelete && Object.keys(jsonSchema).length < 1){
              
        app.use(`/${docs}`, function(req, res, next){
            let host = req.get('host');
            if(registeredTempelete.servers.length === 0){
                registeredTempelete.servers = [{url:'http://'+ host}];
            }
            req.swaggerDoc = registeredTempelete;
            next();
        }, swaggerUi.serveFiles(registeredTempelete), swaggerUi.setup());
    }
    // render JSdocs templete for all the registered routes in the app 
    else{
        let currentTemplate = JSON.parse(fs.readFileSync(join(autoGenPath, "swaggerDocument.json")))
        const currentPath = {}

        //update Jsdocs swagger templete info object if there is any chnage
        if(!_.isEqual(templete.info, currentTemplate.info)){
            currentTemplate.info = templete.info
        }   
    
        for(let routeObj of routes){
            if(currentTemplate.paths[routeObj.path] && currentTemplate.paths[routeObj.path][routeObj.method]){
                currentPath[routeObj.path] = {...currentPath[routeObj.path]}
                currentPath[routeObj.path][routeObj.method] = currentTemplate.paths[routeObj.path][routeObj.method]
            }else{
                currentPath[routeObj.path] = {...currentPath[routeObj.path]}
                currentPath[routeObj.path][routeObj.method] = registeredTempelete.paths[routeObj.path][routeObj.method]
            }
        }
        currentTemplate.paths = currentPath
        app.use(`/${docs}`,swaggerUi.serve, swaggerUi.setup(currentTemplate))
        currentTemplate && (
            fs.writeFileSync( join(autoGenPath, "swaggerDocument.json"), JSON.stringify(currentTemplate),
                (err)=>{
                    if(err) console.log(err)
                } 
            )
        )
    }
}

module.exports ={
    config
}