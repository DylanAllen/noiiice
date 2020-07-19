<template>
  <div id="homepage" class="fullwidth-container">
    <section>
      <h1 class="title">
        About Noiiice
      </h1>
    </section>
    <section class="inverted">
      <div class="section-container">
        <p>
          Thank you for checking Noiiice out! My name is <a href="https://dylanallen.net">Dylan Allen</a>, and I have been working on this project in my spare time.
          I wanted to create a blog CMS that uses serverless technologies, a modern front end framework, server side rendering, and is cheap to operate.
        </p>
        <p>
          Noiice accomplishes this with the NuxtJS framework (serverside rendering), running on an AWS Lambda function (serverless, and cheap),
          and using the serverless framework to deploy all of the back end resources needed to run and secure the application (API Gateway, Cognito, S3, IAM policies & roles).
        </p>
        <p>
          I have tried to automate the deployment process as much as possible to make Noiiice easy to get stared with. However, this is still geared towards developers.
          You will have to use the command line, and be able to modify code to make any meaningful changes to the overall design.
        </p>
        <p>
          But this is a blog platform, so creating blog posts is the easy part. You can use markdown or HTML in the built in web interface for writing, publishing, and editing your posts.
          If you want to create and edit pages (like this one) you will have to edit the code and deploy your changes. Once you have the site up and running, a re-deploy can be done with one command.
        </p>
      </div>
    </section>
    <section>
      <div class="section-container">
        <p>
          If you really want to get creative with it, you should learn more about the <a href="https://nuxtjs.org">Nuxt</a> framework. The front end is all Nuxt, which runs on <a href="https://vuejs.org">VueJS</a>.
        </p>
        <p>
          If you want to help make Noiiice better, pull requests are welcome on the <a href="https://github.com/DylanAllen/noiiice">Noiiice Github</a> repo.
        </p>
      </div>
    </section>
  </div>
</template>

<script>

export default {
  name: 'About',
  head() {
    return {
      title: 'About Noiice Blog | A Serverless Blog by Dylan Allen',
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: 'Noiiice Blog is a serverless blog developed by Dylan Allen. It is built on AWS services, Nuxt, and irrational exuberance'
        }
      ]
    }
  }
}
</script>
