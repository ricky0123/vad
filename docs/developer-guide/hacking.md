# Hacking

## Setting up a dev environment

After cloning the repository, the following commands will install dependencies for the project and run the automated tests. They should all be run from the top level of the repository.

1. `npm install` to install dependencies.
2. `npm run build` to build all of the packages.
3. `npm run test` to run the automated tests.

## Manual testing

The automated tests are useful, but manual testing is even more important. There is now a site included in the source code that you can add to in order to test your changes. I would like to make this an open "playground" for people to put whatever helps them test their changes. You can run the test site by running `npm run dev`. If you make any changes to `vad-web`, `vad-react`, or the source code for the test site, you can wait a few seconds and the test site should refresh in your browser with the changes you made.

## Project Management

I set up a [Github project for VAD](https://github.com/users/ricky0123/projects/1) to track work related to the project.
