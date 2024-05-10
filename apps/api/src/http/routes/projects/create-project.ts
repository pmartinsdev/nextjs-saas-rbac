import z from "zod";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { prisma } from "@/lib/prisma";
import { auth } from "@/http/middlewares/auth";
import { createSlug } from "@/utils/create-slug";
import { getUserPermissions } from "@/utils/get-user-permissions";
import { UnauthorizedError } from "../_errors/unauthorized-error";

export function createProject(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().register(auth).post('/organizations/:slug/projects', {
    schema: {
      tags: ['Projects'],
      summary: 'Create a new project',
      body: z.object({
        name: z.string(),
        description: z.string()
      }),
      params: z.object({
        slug: z.string()
      }),
      response: {
        201: z.object({
          projectId: z.string()
        })
      }
    }
  },
    async (request, reply) => {
      const { slug } = request.params

      const userId = await request.getCurrentUserId()
      const { organization, membership } = await request.getUserMembership(slug)


      const { cannot } = getUserPermissions(userId, membership.role)

      if (cannot('create', 'Project')) throw new UnauthorizedError(`You're not allowed to create new projects.`)

      const { name, description } = request.body


      const project = await prisma.projects.create({
        data: {
          name,
          slug: createSlug(name),
          description,
          ownerId: userId,
          organizationId: organization.id
        }
      })

      return reply.status(201).send({
        projectId: project.id
      })
    }
  )
}