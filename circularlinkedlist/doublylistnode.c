#include <stdio.h>
#include <stdlib.h>

struct node
{
    struct node *prev;
    int data;
    struct node *next;
};
struct node *CircularDoubly(int data)
{
    struct node *temp = malloc(sizeof(struct node));
    temp->prev = temp;
    temp->data = data;
    temp->next = temp;
    return temp;
}

void printlist(struct node *tail){
    struct node *head= tail->next;
    while(1){
        printf("%d ",head->data);
        head= head->next;
        if(head== tail->next)
            break;
    }
}
int main(void)
{
    struct node *tail= CircularDoubly(1);
    CircularDoubly(2);
    CircularDoubly(3);
    CircularDoubly(4);
    printlist(tail);
    return 0;
}
