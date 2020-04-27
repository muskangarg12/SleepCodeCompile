const route = require("express").Router();

const { Group, Chat } = require("../models");

const { checkLoggedIn } = require("../utils/auth");


//====================
//       ROUTES
//====================


route.get("/new", checkLoggedIn, (req, res) => {
    res.render("group/new", {
        success: req.flash("success"),
        error: req.flash("error")
    });
});


route.post("/", checkLoggedIn, async (req, res) => {
    try {
        console.log("req === " + req.user);
        const group = await Group.findByName(req.body.groupName);

        if (group !== null) {
            req.flash("error", `Group ${req.body.groupName} already present!`);
            return res.redirect("/groups/new");
        }

        const code = "#include <stdio.h>\nint main(void) {\n\t// your code goes here\n\treturn 0;\n}";
        const chat = await Chat.create({ messages: [] , initcode: {code: code, lang: "C"}, compiledCodes: []});
        
        const newGroup = await Group.create({
            name: req.body.groupName,
            members: [{
                username: req.user.username,
                unreadMessages: 0
            }],
            chat: chat,
        });

        req.user.groups.push(newGroup);
        await req.user.save();

        res.redirect(`/groups/${newGroup.id}/chat`);

    } catch (err) {
        console.error(err.stack);
        res.sendStatus(500);
    }
});

route.get("/join", checkLoggedIn, (req, res) => {
    res.render("group/join", {
        success: req.flash("success"),
        error: req.flash("error")
    });
});

route.post("/join", checkLoggedIn, async (req, res) => {
    try {
        const group = await Group.findByName(req.body.groupName);

        if (group === null) {
            req.flash("error", `Group ${req.body.groupName} not found!`);
            return res.redirect("/groups/join");
        }


        const promises = [];
        if (group.members.findIndex(member => member.username === req.user.username) === -1) {
            group.members.push({
                username: req.user.username,
                unreadMessages: 0
            });
            promises.push(group.save());
        }

        if (req.user.groups.filter(grp => grp.equals(group.id)).length === 0) {
            req.user.groups.push(group);
            promises.push(req.user.save());
        }

        await Promise.all(promises);

        res.redirect(`/groups/${group.id}/chat`);

    } catch (err) {
        console.error(err.stack);
        res.sendStatus(500);
    }
});


route.get("/:groupId/chat", checkLoggedIn, async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.groupId);
        if (group === null)
            return next();

        if (group.members.findIndex(member => member.username === req.user.username) === -1) {
            req.flash("error", "Join the Group to Chat there!");
            return res.redirect("/chats");
        }

        res.render("group", { title: group.name, groupId: group.id });

    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

route.get("/:groupId", checkLoggedIn, async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.groupId);
        if (group === null)
            return next();
        
        if (group.members.findIndex(member => member.username === req.user.username) === -1) {
            req.flash("error", "Join the group to know its Details!");
            return res.redirect("/chats");
        }

        const chat = await Chat.findById(group.chat);
    
        res.render("group/details", {
            title: group.name,
            groupId: group.id,
            members: group.members.map(member => member.username),
            codelinks: chat.compiledCodes
        });

    } catch (err) {
        console.error(err.stack);
        res.sendStatus(500);
    }
});


route.post("/:groupId/leave", checkLoggedIn, async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);

        if (group === null) {
            req.flash("error", "Group not found!");
            return res.redirect("/chats");
        }

        const index = group.members.findIndex(member => member.username === req.user.username);
        if (index === -1) {
            req.flash("error", "User not in the Group!!");
            return res.redirect("/chats");
        }
        
        const promises = [];

        group.members.splice(index, 1);
        if (group.members.length === 0) {
            promises.push(Chat.findByIdAndRemove(group.chat));
            promises.push(group.remove());
        }
        else
            promises.push(group.save());

        req.user.groups = req.user.groups.filter(grp => !grp.equals(group.id));
        promises.push(req.user.save());

        await Promise.all(promises);

        req.flash("success", `Successfully left the group ${group.name}!`);
        res.redirect("/chats");

    } catch (err) {
        console.error(err.stack);
        res.sendStatus(500);
    }
});


module.exports = route;