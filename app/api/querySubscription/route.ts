// app/api/querySubscription/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from '@/lib/db/drizzle';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { eq, sql } from 'drizzle-orm';
import { users, teams } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  try {
    // Retrieve the authenticated user
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }
    
    // Parse the request body
    const { action, isDeepQuery = false } = await request.json();
    
    // Get user with team info
    const userWithTeam = await getUserWithTeam(user.id);
    
    // Get user's current query counts
    const userData = await db
      .select({
        totalQueries: users.totalQueries,
        totalDeepQueries: users.totalDeepQueries
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    
    // Check team subscription status
    let hasActiveSubscription = false;
    let stripeSubscriptionId = null;
    
    if (userWithTeam?.teamId) {
      const teamData = await db
        .select({
          stripeSubscriptionId: teams.stripeSubscriptionId,
          subscriptionStatus: teams.subscriptionStatus
        })
        .from(teams)
        .where(eq(teams.id, userWithTeam.teamId))
        .limit(1);
      
      if (teamData.length > 0) {
        stripeSubscriptionId = teamData[0].stripeSubscriptionId;
        hasActiveSubscription = 
          stripeSubscriptionId !== null &&
          (teamData[0].subscriptionStatus === 'active' || 
           teamData[0].subscriptionStatus === 'trialing');
      }
    }
    
    // If action is "update" and we have a subscription, reset counters
    if (action === "update" && hasActiveSubscription) {
      await db
        .update(users)
        .set({
          totalQueries: 0,
          totalDeepQueries: 0
        })
        .where(eq(users.id, user.id));
    }
    // If action is "update" and no subscription, increment counters
    else if (action === "update" && !hasActiveSubscription) {
      await db
        .update(users)
        .set({
          totalQueries: sql`${users.totalQueries} + 1`,
          ...(isDeepQuery && { totalDeepQueries: sql`${users.totalDeepQueries} + 1` })
        })
        .where(eq(users.id, user.id));
    }
    
    // Calculate current counts for the response
    const currentTotalQueries = userData[0]?.totalQueries || 0;
    const currentTotalDeepQueries = userData[0]?.totalDeepQueries || 0;
    
    // Return the subscription status and counter information
    return NextResponse.json({
      totalQueries: action === "update" && !hasActiveSubscription ? 
        currentTotalQueries + 1 : currentTotalQueries,
      totalDeepQueries: (action === "update" && !hasActiveSubscription && isDeepQuery) ? 
        currentTotalDeepQueries + 1 : currentTotalDeepQueries,
      hasActiveSubscription,
      stripeSubscriptionId,
      hasReachedLimit: !hasActiveSubscription && currentTotalQueries >= 9 // Check if current count is 9 or more
    });
  } catch (error: any) {
    console.error('Error processing subscription query:', error);
    return NextResponse.json({ error: error.message || 'Failed to process subscription' }, { status: 500 });
  }
}