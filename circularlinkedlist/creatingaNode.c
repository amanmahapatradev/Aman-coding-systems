#include <stdio.h>
#include <stdlib.h>

struct node {
    int data;
    struct node *next;
};
struct node * CircularSingly(int data){
    struct node* temp = malloc(sizeof(struct node));
    temp -> data = data;
    temp -> next = temp;
    return temp;

}
int main(void) {
    int data = 1;
    struct node* tail;
    tail = CircularSingly(data);
    printf("%d", tail -> data);
    return 0;
}