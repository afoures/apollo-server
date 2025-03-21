import type {
  GraphQLScalarType,
  GraphQLFieldResolver,
  GraphQLTypeResolver,
  GraphQLIsTypeOfFn,
} from 'graphql';
import { makeExecutableSchemaWithCacheControlSupport } from './cacheControlSupport';

import { CacheScope } from 'apollo-server-types';
import { collectCacheControlHints } from './collectCacheControlHints';

export interface GraphQLResolvers {
  [fieldName: string]: (() => any) | GraphQLResolverObject | GraphQLScalarType;
}

export type GraphQLResolverObject = {
  [fieldName: string]: GraphQLFieldResolver<any, any> | GraphQLResolverOptions;
};

export interface GraphQLResolverOptions {
  resolve?: GraphQLFieldResolver<any, any>;
  subscribe?: GraphQLFieldResolver<any, any>;
  __resolveType?: GraphQLTypeResolver<any, any>;
  __isTypeOf?: GraphQLIsTypeOfFn<any, any>;
}

describe('dynamic cache control', () => {
  it('should set the maxAge for a field from a dynamic cache hint', async () => {
    const typeDefs = `
      type Query {
        droid(id: ID!): Droid
      }

      type Droid {
        id: ID!
        name: String!
      }
    `;

    const resolvers: GraphQLResolvers = {
      Query: {
        droid: (_source, _args, _context, { cacheControl }) => {
          cacheControl.setCacheHint({ maxAge: 60 });
          return {
            id: 2001,
            name: 'R2-D2',
          };
        },
      },
    };

    const schema = makeExecutableSchemaWithCacheControlSupport({
      typeDefs,
      resolvers,
    });

    const hints = await collectCacheControlHints(
      schema,
      `
        query {
          droid(id: 2001) {
            name
          }
        }
      `,
      { defaultMaxAge: 10 },
    );

    expect(hints).toStrictEqual(new Map([['droid', { maxAge: 60 }]]));
  });

  it('can use restrict to set the maxAge for a field', async () => {
    const typeDefs = `
      type Query {
        droid(id: ID!): Droid
      }

      type Droid {
        id: ID!
        name: String!
      }
    `;

    const resolvers: GraphQLResolvers = {
      Query: {
        droid: (_source, _args, _context, { cacheControl }) => {
          cacheControl.cacheHint.restrict({ maxAge: 60 });
          return {
            id: 2001,
            name: 'R2-D2',
          };
        },
      },
    };

    const schema = makeExecutableSchemaWithCacheControlSupport({
      typeDefs,
      resolvers,
    });

    const hints = await collectCacheControlHints(
      schema,
      `
        query {
          droid(id: 2001) {
            name
          }
        }
      `,
      { defaultMaxAge: 10 },
    );

    expect(hints).toStrictEqual(new Map([['droid', { maxAge: 60 }]]));
  });

  it('should set the scope for a field from a dynamic cache hint', async () => {
    const typeDefs = `
      type Query {
        droid(id: ID!): Droid @cacheControl(maxAge: 60)
      }

      type Droid {
        id: ID!
        name: String!
      }
    `;

    const resolvers: GraphQLResolvers = {
      Query: {
        droid: (_source, _args, _context, { cacheControl }) => {
          cacheControl.setCacheHint({ scope: CacheScope.Private });
          return {
            id: 2001,
            name: 'R2-D2',
          };
        },
      },
    };

    const schema = makeExecutableSchemaWithCacheControlSupport({
      typeDefs,
      resolvers,
    });

    const hints = await collectCacheControlHints(
      schema,
      `
        query {
          droid(id: 2001) {
            name
          }
        }
      `,
      { defaultMaxAge: 10 },
    );

    expect(hints).toStrictEqual(
      new Map([['droid', { maxAge: 60, scope: CacheScope.Private }]]),
    );
  });

  it('should override the maxAge set for a field from a dynamic cache hint', async () => {
    const typeDefs = `
      type Query {
        droid(id: ID!): Droid @cacheControl(maxAge: 60)
      }

      type Droid {
        id: ID!
        name: String!
      }
    `;

    const resolvers: GraphQLResolvers = {
      Query: {
        droid: (_source, _args, _context, { cacheControl }) => {
          cacheControl.setCacheHint({ maxAge: 120 });
          return {
            id: 2001,
            name: 'R2-D2',
          };
        },
      },
    };

    const schema = makeExecutableSchemaWithCacheControlSupport({
      typeDefs,
      resolvers,
    });

    const hints = await collectCacheControlHints(
      schema,
      `
        query {
          droid(id: 2001) {
            name
          }
        }
      `,
      { defaultMaxAge: 10 },
    );

    expect(hints).toStrictEqual(new Map([['droid', { maxAge: 120 }]]));
  });
});
